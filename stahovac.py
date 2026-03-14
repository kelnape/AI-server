import os
import io
import json
import time
import logging
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from googleapiclient.errors import HttpError

# ── Konfigurace ────────────────────────────────────────────────────────────────
SCOPES         = ['https://www.googleapis.com/auth/drive.readonly']
SLOZKA_ZALOHY  = "Zaloha_Disku"
SOUBOR_STAVU   = "zaloha_stav.json"   # md5 otisků → detekce změn
MAX_POKUSU     = 4                    # počet opakování při chybě
PRODLEVA_START = 2                    # sekund před prvním opakováním (zdvojuje se)

# Exportní formáty pro Google Workspace soubory
EXPORT_MAPY = {
    'application/vnd.google-apps.document':     ('application/pdf', '.pdf'),
    'application/vnd.google-apps.spreadsheet':  (
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'),
    'application/vnd.google-apps.presentation': ('application/pdf', '.pdf'),
    'application/vnd.google-apps.drawing':      ('image/svg+xml', '.svg'),
    'application/vnd.google-apps.form':         ('application/pdf', '.pdf'),
    'application/vnd.google-apps.script':       ('application/vnd.google-apps.script+json', '.json'),
}

# ── Logování ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s  %(levelname)-8s %(message)s',
    datefmt='%H:%M:%S',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('zaloha.log', encoding='utf-8'),
    ]
)
log = logging.getLogger(__name__)


# ── Autentizace ────────────────────────────────────────────────────────────────
def overeni() -> Credentials:
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as f:
            f.write(creds.to_json())
    return creds


# ── Stav zálohy (md5 otisky) ───────────────────────────────────────────────────
def nacti_stav() -> dict:
    if os.path.exists(SOUBOR_STAVU):
        with open(SOUBOR_STAVU, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def uloz_stav(stav: dict):
    with open(SOUBOR_STAVU, 'w', encoding='utf-8') as f:
        json.dump(stav, f, ensure_ascii=False, indent=2)


# ── Mapování složek Drive → lokální cesty ─────────────────────────────────────
def nacti_strukturu_slozek(service) -> dict[str, str]:
    """
    Vrátí slovník {folder_id: 'Rodic/Dite/…'} pro zachování
    adresářové struktury z Google Drive.
    """
    log.info("Načítám strukturu složek z Google Drive…")
    slozky = {}
    page_token = None

    while True:
        resp = service.files().list(
            q="mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            pageSize=1000,
            fields="nextPageToken, files(id, name, parents)",
            pageToken=page_token,
        ).execute()

        for item in resp.get('files', []):
            slozky[item['id']] = {'name': item['name'], 'parents': item.get('parents', [])}

        page_token = resp.get('nextPageToken')
        if not page_token:
            break

    # Sestav plné cesty rekurzivně
    def cesta_slozky(fid: str, navstivene: set) -> str:
        if fid not in slozky:
            return ''
        if fid in navstivene:          # ochrana před cyklem
            return slozky[fid]['name']
        navstivene.add(fid)
        rodice = slozky[fid]['parents']
        if not rodice or rodice[0] not in slozky:
            return slozky[fid]['name']
        return cesta_slozky(rodice[0], navstivene) + os.sep + slozky[fid]['name']

    return {fid: cesta_slozky(fid, set()) for fid in slozky}


# ── Stahování s opakováním ─────────────────────────────────────────────────────
def stahni_s_opakovanim(request, cesta: str) -> bool:
    """Stáhne soubor do `cesta`, při selhání zkusí MAX_POKUSU krát."""
    prodleva = PRODLEVA_START
    for pokus in range(1, MAX_POKUSU + 1):
        try:
            os.makedirs(os.path.dirname(cesta), exist_ok=True)
            with io.FileIO(cesta, 'wb') as fh:
                downloader = MediaIoBaseDownload(fh, request)
                done = False
                while not done:
                    _, done = downloader.next_chunk()
            return True
        except HttpError as e:
            if e.resp.status in (429, 500, 503) and pokus < MAX_POKUSU:
                log.warning(f"    Chyba {e.resp.status}, čekám {prodleva}s (pokus {pokus}/{MAX_POKUSU})…")
                time.sleep(prodleva)
                prodleva *= 2
            else:
                raise
    return False


# ── Zpracování jednoho souboru ─────────────────────────────────────────────────
def zpracuj_soubor(
    service,
    item: dict,
    cesta_slozky: str,
    stav: dict,
    chyby: list,
) -> bool:
    """
    Vrátí True, pokud byl soubor stažen (nový nebo změněný).
    """
    file_id   = item['id']
    file_name = item['name']
    mime_type = item['mimeType']
    md5       = item.get('md5Checksum', '')  # Google formáty md5 nemají

    # Lokální adresář dle struktury Drive
    lokalni_adresar = os.path.join(SLOZKA_ZALOHY, cesta_slozky) if cesta_slozky else SLOZKA_ZALOHY
    
    # Přípona a export MIME
    if mime_type in EXPORT_MAPY:
        export_mime, pripona = EXPORT_MAPY[mime_type]
    else:
        export_mime, pripona = None, ''

    lokalni_cesta = os.path.join(lokalni_adresar, file_name + pripona)

    # ── Zkontroluj, zda je soubor nový nebo změněný ──
    klic_stavu = file_id
    if os.path.exists(lokalni_cesta):
        predchozi_md5 = stav.get(klic_stavu, {}).get('md5', '')
        if md5 and md5 == predchozi_md5:
            log.debug(f"  [=] '{file_name}' beze změny, přeskakuji.")
            return False
        if not md5:
            # Google formáty nemají md5 → porovnej čas změny
            predchozi_cas = stav.get(klic_stavu, {}).get('modifiedTime', '')
            if predchozi_cas == item.get('modifiedTime', ''):
                log.debug(f"  [=] '{file_name}' beze změny (čas), přeskakuji.")
                return False

    try:
        if export_mime:
            request = service.files().export_media(fileId=file_id, mimeType=export_mime)
        else:
            request = service.files().get_media(fileId=file_id)

        stahni_s_opakovanim(request, lokalni_cesta)

        # Ulož otisk do stavu
        stav[klic_stavu] = {
            'md5':          md5,
            'modifiedTime': item.get('modifiedTime', ''),
            'nazev':        file_name,
        }
        log.info(f"  [↓] {os.path.join(cesta_slozky, file_name + pripona)}")
        return True

    except HttpError as e:
        duvod = getattr(e, 'reason', str(e))
        if 'exportSizeLimitExceeded' in duvod:
            duvod = 'Příliš velký soubor na automatický převod (stáhni ručně).'
        log.error(f"  [✗] '{file_name}' — {duvod}")
        chyby.append({'nazev': file_name, 'duvod': duvod})

    except Exception as e:
        log.error(f"  [✗] '{file_name}' — neočekávaná chyba: {e}")
        chyby.append({'nazev': file_name, 'duvod': str(e)})

    return False


# ── Hlavní funkce ──────────────────────────────────────────────────────────────
def main():
    Path(SLOZKA_ZALOHY).mkdir(exist_ok=True)

    try:
        creds   = overeni()
        service = build('drive', 'v3', credentials=creds)
        stav    = nacti_stav()
        mapa_slozek = nacti_strukturu_slozek(service)  # {folder_id: 'cesta'}

        log.info("Zálohuji Google Drive…")

        query      = "mimeType != 'application/vnd.google-apps.folder' and trashed = false"
        page_token = None
        celkem     = 0
        stazeno    = 0
        chyby: list[dict] = []

        while True:
            resp = service.files().list(
                q=query,
                pageSize=100,
                fields="nextPageToken, files(id, name, mimeType, md5Checksum, modifiedTime, parents)",
                pageToken=page_token,
            ).execute()

            for item in resp.get('files', []):
                # Zjisti lokální podadresář dle rodiče souboru
                rodice = item.get('parents', [])
                cesta  = mapa_slozek.get(rodice[0], '') if rodice else ''

                if zpracuj_soubor(service, item, cesta, stav, chyby):
                    stazeno += 1
                celkem += 1

            # Průběžně ukládej stav (odolnost vůči přerušení)
            uloz_stav(stav)

            page_token = resp.get('nextPageToken')
            if not page_token:
                break

        # ── Závěrečný přehled ──────────────────────────────────────────────────
        log.info("=" * 50)
        log.info(f"HOTOVO!  Zkontrolováno: {celkem}  |  Staženo/aktualizováno: {stazeno}")

        if chyby:
            log.warning(f"Chyby u {len(chyby)} souborů — stáhni ručně přes prohlížeč:")
            log.warning("-" * 50)
            for ch in chyby:
                log.warning(f"  ✗  {ch['nazev']}\n     {ch['duvod']}")
        else:
            log.info("Všechny soubory úspěšně zálohovány. Žádné chyby. ✓")
        log.info("=" * 50)

    except HttpError as e:
        log.error(f"Chyba Drive API: {e}")
    except FileNotFoundError:
        log.error("Chybí soubor 'credentials.json'. Stáhl sis ho z Google Cloud Console?")


if __name__ == '__main__':
    main()