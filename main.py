import os
import json
import asyncio
import re
import sqlite3
import docker
import time
import psutil
import subprocess
import base64
import zipfile
import io
import uuid
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import TypedDict, Annotated, Sequence, Optional
from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage, ToolMessage
from langchain_core.tools import tool
import operator
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

try:
    from langchain_anthropic import ChatAnthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

try:
    from pypdf import PdfReader
    import io
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False

try:
    from langchain_chroma import Chroma
except ImportError:
    from langchain_community.vectorstores import Chroma

load_dotenv()

# --- KONFIGURACE CEST ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SUDO_PASSWORD  = os.getenv("SUDO_PASSWORD", "")
DB_PATH        = os.path.join(BASE_DIR, "system_data.db")
CHROMA_PATH    = os.path.join(BASE_DIR, "chroma_db")

# --- BEZPEČNOST ---
API_SECRET = os.getenv("API_SECRET", "")
# Endpointy které nevyžadují autentizaci (health check)
PUBLIC_PATHS = {"/", "/docs", "/openapi.json", "/api/health"}

# --- GIT KONFIGURACE ---
GIT_REPO_PATH  = os.getenv("GIT_REPO_PATH", BASE_DIR)
GIT_USER_NAME  = os.getenv("GIT_USER_NAME", "Engineering AI")
GIT_USER_EMAIL = os.getenv("GIT_USER_EMAIL", "ai@kelnape.eu")
GIT_TOKEN      = os.getenv("GIT_TOKEN", "")

# --- TELEGRAM ---
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID   = os.getenv("TELEGRAM_CHAT_ID", "")

async def telegram_notify(message: str):
    """Pošle zprávu přes Telegram bota. Tiše selže pokud není nakonfigurováno."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        import urllib.request
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        data = json.dumps({"chat_id": TELEGRAM_CHAT_ID, "text": message,
                           "parse_mode": "Markdown"}).encode()
        req = urllib.request.Request(url, data=data,
              headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        pass

CB = "`" * 3
SESSION_HISTORY = []
MAX_HISTORY = 10
SYSTEM_ALERTS = []

# --- DOSTUPNÉ MODELY ---
AVAILABLE_MODELS = {
    "gpt-4o-mini":       {"provider": "openai",    "label": "GPT-4o Mini"},
    "gpt-4o":            {"provider": "openai",    "label": "GPT-4o"},
    "claude-sonnet-4-5": {"provider": "anthropic", "label": "Claude Sonnet 4.5"},
}
ACTIVE_MODEL = "gpt-4o-mini"

def build_llm(model_id: str = None):
    """Vytvoří LLM instanci podle zvoleného modelu."""
    mid = model_id or ACTIVE_MODEL
    info = AVAILABLE_MODELS.get(mid, AVAILABLE_MODELS["gpt-4o-mini"])
    if info["provider"] == "anthropic":
        if not ANTHROPIC_AVAILABLE:
            raise RuntimeError("Chybí knihovna. Spusť: pip install langchain-anthropic")
        if not os.getenv("ANTHROPIC_API_KEY"):
            raise RuntimeError("Chybí ANTHROPIC_API_KEY v .env souboru.")
        return ChatAnthropic(model=mid, temperature=0.1, max_tokens=4096)
    return ChatOpenAI(model=mid, temperature=0.1)

# --- INICIALIZACE SQLITE ---
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS task_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT,
        query TEXT, response TEXT, code TEXT, date TEXT, model TEXT,
        quality_score REAL DEFAULT NULL,
        quality_reason TEXT DEFAULT NULL,
        feedback INTEGER DEFAULT NULL
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS agent_prompts (
        agent_id TEXT PRIMARY KEY,
        custom_prompt TEXT,
        updated_at TEXT
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT, agent_id TEXT, model TEXT,
        input_tokens INTEGER, output_tokens INTEGER,
        cost_usd REAL, duration_ms INTEGER, date TEXT
    )''')
    # Fronta úkolů — batch zpracování
    c.execute('''CREATE TABLE IF NOT EXISTS task_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        model_id TEXT DEFAULT NULL,
        status TEXT DEFAULT 'pending',
        result TEXT DEFAULT NULL,
        code TEXT DEFAULT NULL,
        lang TEXT DEFAULT NULL,
        quality_score REAL DEFAULT NULL,
        created_at TEXT,
        started_at TEXT,
        finished_at TEXT
    )''')
    # Feedback uživatele na odpovědi
    c.execute('''CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT,
        query TEXT,
        response TEXT,
        thumbs INTEGER,
        comment TEXT DEFAULT NULL,
        date TEXT
    )''')
    # Noční analýza — logy a doporučení
    c.execute('''CREATE TABLE IF NOT EXISTS night_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        total_tasks INTEGER,
        avg_quality REAL,
        failed_tasks INTEGER,
        top_issues TEXT,
        recommendations TEXT,
        prompt_suggestions TEXT
    )''')
    conn.commit(); conn.close()

init_db()

# --- VLASTNÍ PROMPTY AGENTŮ ---
def load_agent_prompts() -> dict:
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('SELECT agent_id, custom_prompt FROM agent_prompts')
        rows = c.fetchall(); conn.close()
        return {r[0]: r[1] for r in rows if r[1]}
    except Exception:
        return {}

def get_agent_extra(agent_id: str) -> str:
    return load_agent_prompts().get(agent_id, "")

# --- IDENTITA TÝMU ---
BASE_TEAM_IDENTITY = """
Jsi členem elitního inženýrského AI týmu "Engineering AI System v9.2".
Uživatelem a tvým nadřízeným je Kelnape.

Tvůj tým: Manažer, Plánovač, Expert, Výzkumník, Architekt, Auditor,
Tester, Kodér, SysAdmin, Reflektor, Finalizér.

Vždy mluv česky. Buď profesionální a technicky přesný.
"""

def team_identity(agent_id: str = "") -> str:
    extra = get_agent_extra(agent_id)
    if extra:
        return BASE_TEAM_IDENTITY + f"\n\n--- VLASTNÍ INSTRUKCE ({agent_id}) ---\n{extra}\n"
    return BASE_TEAM_IDENTITY

# =============================================================================
# KONTEXT PROJEKTU — automaticky načtený při každém úkolu
# =============================================================================

def build_project_context() -> str:
    """
    Sestaví živý kontext projektu z filesystem + git.
    Volá se při každém chat requestu — agenti vždy vědí kde jsou.
    """
    ctx_parts = []

    # 1. Git stav
    try:
        branch, ok = _git_run(["branch", "--show-current"])
        if ok and branch.strip():
            ctx_parts.append(f"Git větev: {branch.strip()}")

        status, _ = _git_run(["status", "--short"])
        changed = [l for l in status.strip().splitlines() if l.strip()]
        if changed:
            ctx_parts.append(f"Změněné soubory ({len(changed)}): " +
                             ", ".join(l[3:].strip() for l in changed[:8]))
        else:
            ctx_parts.append("Git status: čistý repozitář")

        last_commit, _ = _git_run(["log", "--oneline", "-3"])
        if last_commit.strip():
            ctx_parts.append("Poslední commity:\n" +
                             "\n".join(f"  {l}" for l in last_commit.strip().splitlines()))
    except Exception:
        pass

    # 2. Struktura projektu (top-level + backend/frontend)
    try:
        entries = []
        for entry in sorted(os.listdir(GIT_REPO_PATH)):
            if entry.startswith('.') or entry in ('node_modules','__pycache__','.venv','dist','chroma_db'):
                continue
            full = os.path.join(GIT_REPO_PATH, entry)
            entries.append(f"  {'📁' if os.path.isdir(full) else '📄'} {entry}")
        if entries:
            ctx_parts.append("Struktura projektu:\n" + "\n".join(entries[:20]))
    except Exception:
        pass

    # 3. Tech stack — requirements.txt
    try:
        req_path = os.path.join(GIT_REPO_PATH, "requirements.txt")
        if os.path.exists(req_path):
            with open(req_path) as f:
                pkgs = [l.strip().split("==")[0].split(">=")[0]
                        for l in f.read().splitlines()
                        if l.strip() and not l.startswith("#")][:15]
            if pkgs:
                ctx_parts.append(f"Python závislosti: {', '.join(pkgs)}")
    except Exception:
        pass

    # 4. Tech stack — package.json (frontend)
    try:
        pkg_path = os.path.join(GIT_REPO_PATH, "frontend", "package.json")
        if os.path.exists(pkg_path):
            with open(pkg_path) as f:
                pkg = json.load(f)
            deps = list({**pkg.get("dependencies",{}), **pkg.get("devDependencies",{})}.keys())[:12]
            if deps:
                ctx_parts.append(f"Frontend závislosti: {', '.join(deps)}")
    except Exception:
        pass

    # 5. Systémové info
    try:
        import platform
        ctx_parts.append(f"Server: {platform.system()} {platform.machine()} | "
                        f"Python {platform.python_version()} | "
                        f"CPU {psutil.cpu_percent(interval=None):.0f}% | "
                        f"RAM {psutil.virtual_memory().percent:.0f}%")
    except Exception:
        pass

    if not ctx_parts:
        return ""

    return "\n\n--- KONTEXT PROJEKTU (live) ---\n" + "\n".join(ctx_parts) + "\n---\n"

# Cache kontextu — obnovuje se každých 60 sekund
_project_ctx_cache: dict = {"ts": 0, "ctx": ""}

def get_project_context() -> str:
    now = time.time()
    if now - _project_ctx_cache["ts"] > 60:
        _project_ctx_cache["ctx"] = build_project_context()
        _project_ctx_cache["ts"] = now
    return _project_ctx_cache["ctx"]

def team_identity_with_context(agent_id: str = "") -> str:
    """team_identity + živý kontext projektu."""
    return team_identity(agent_id) + get_project_context()

# --- STAV GRAFU ---
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    iterations: int
    status: str
    route: str
    error_log: str
    plan: list[str]
    current_step: int
    model_id: str
    task_id: str
    project_specs: dict   # intake formulář — specifika projektu
    is_web_project: bool  # příznak pro Designer agenta

# --- SYSTÉMOVÝ MONITOR ---
async def system_monitor_loop():
    global SYSTEM_ALERTS
    while True:
        try:
            alerts = []
            if psutil.cpu_percent(interval=1) > 90:
                alerts.append("Kritické zatížení CPU (>90%)")
            mem = psutil.virtual_memory()
            if mem.percent > 90:
                alerts.append(f"Kritický nedostatek RAM ({mem.percent}%)")
            temp_path = "/sys/class/thermal/thermal_zone0/temp"
            if os.path.exists(temp_path):
                with open(temp_path) as f:
                    temp = int(f.read().strip()) / 1000
                    if temp > 75:
                        alerts.append(f"Přehřátí RPi ({temp}°C)")
            SYSTEM_ALERTS = alerts
        except Exception:
            pass
        await asyncio.sleep(10)

# --- NÁSTROJE ---
@tool
def execute_linux_command(command: str) -> str:
    """Spustí bash příkaz přímo na Linux serveru (Raspberry Pi)."""
    try:
        if command.strip().startswith("sudo ") and SUDO_PASSWORD:
            command = command.replace("sudo ", f"echo '{SUDO_PASSWORD}' | sudo -S ", 1)
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        output = (result.stdout + "\n" + result.stderr).strip()
        return output if output else "Příkaz proběhl (bez výstupu)."
    except Exception as e:
        return f"Chyba: {str(e)}"

def _git_run(args: list[str], cwd: str = None) -> tuple[str, bool]:
    """Pomocná funkce pro Git příkazy — vrátí (výstup, úspěch)."""
    env = os.environ.copy()
    if GIT_TOKEN:
        env["GIT_ASKPASS"] = "echo"
        env["GIT_TOKEN"] = GIT_TOKEN
    try:
        r = subprocess.run(
            ["git"] + args,
            cwd=cwd or GIT_REPO_PATH,
            capture_output=True, text=True, timeout=60, env=env
        )
        out = (r.stdout + r.stderr).strip()
        return out, r.returncode == 0
    except Exception as e:
        return str(e), False

@tool
def git_operation(operation: str, message: str = "", branch: str = "") -> str:
    """
    Provádí Git operace v repozitáři projektu.
    Operace: status, log, diff, add, commit, push, pull, branch, checkout, stash
    Parametr message: commit zpráva (pro commit)
    Parametr branch: název větve (pro checkout/branch)
    """
    op = operation.strip().lower()

    if op == "status":
        out, _ = _git_run(["status", "--short", "--branch"])
        return out or "Čistý repozitář."

    elif op == "log":
        out, _ = _git_run(["log", "--oneline", "--graph", "--decorate", "-15"])
        return out or "Žádné commity."

    elif op == "diff":
        out, _ = _git_run(["diff", "--stat"])
        return out or "Žádné změny."

    elif op == "add":
        out, ok = _git_run(["add", "-A"])
        return f"✅ Staged: {out}" if ok else f"❌ {out}"

    elif op == "commit":
        if not message:
            message = f"Auto-commit: {datetime.now().strftime('%d.%m.%Y %H:%M')}"
        # Nastav identitu pokud chybí
        _git_run(["config", "user.email", GIT_USER_EMAIL])
        _git_run(["config", "user.name", GIT_USER_NAME])
        out, ok = _git_run(["commit", "-m", message])
        return f"✅ Commit: {out}" if ok else f"❌ {out}"

    elif op == "push":
        out, ok = _git_run(["push"])
        return f"✅ Push: {out}" if ok else f"❌ Push selhal: {out}"

    elif op == "pull":
        out, ok = _git_run(["pull", "--rebase"])
        return f"✅ Pull: {out}" if ok else f"❌ Pull selhal: {out}"

    elif op == "branch":
        out, _ = _git_run(["branch", "-a"])
        return out or "Žádné větve."

    elif op == "checkout":
        if not branch:
            return "❌ Chybí název větve."
        out, ok = _git_run(["checkout", branch])
        return f"✅ {out}" if ok else f"❌ {out}"

    elif op == "stash":
        out, ok = _git_run(["stash"])
        return f"✅ Stash: {out}" if ok else f"❌ {out}"

    else:
        # Fallback — spusť jako přímý git příkaz
        out, ok = _git_run(operation.split())
        return out

@tool
def search_internet(query: str) -> str:
    """Hledá technické informace na internetu přes DuckDuckGo."""
    try:
        from langchain_community.tools import DuckDuckGoSearchRun
        return DuckDuckGoSearchRun().run(query)
    except Exception as e:
        return f"Vyhledávání selhalo: {str(e)}"

TOOLS_MAP = {
    "execute_linux_command": execute_linux_command,
    "search_internet": search_internet,
    "git_operation": git_operation,
}

def execute_tool_calls(ai_message: AIMessage) -> list[ToolMessage]:
    results = []
    if not hasattr(ai_message, "tool_calls") or not ai_message.tool_calls:
        return results
    for tc in ai_message.tool_calls:
        tool_fn = TOOLS_MAP.get(tc["name"])
        try:
            output = tool_fn.invoke(tc["args"]) if tool_fn else f"Neznámý nástroj: {tc['name']}"
        except Exception as e:
            output = f"Chyba nástroje: {str(e)}"
        results.append(ToolMessage(content=str(output), tool_call_id=tc["id"]))
    return results

# =============================================================================
# ZPRACOVÁNÍ PŘILOŽENÝCH SOUBORŮ
# =============================================================================

class ProcessedFiles:
    """Výsledek analýzy přiložených souborů."""
    def __init__(self):
        self.has_images: bool = False
        self.has_pdfs: bool = False
        self.has_text: bool = False
        self.image_blocks: list = []   # base64 bloky pro Vision
        self.text_summary: str = ""    # extrahovaný text z PDF / textových souborů
        self.file_names: list = []

def process_files(files: list) -> ProcessedFiles:
    """
    Zpracuje přiložené soubory:
    - Obrázky → base64 bloky pro OpenAI Vision
    - PDF     → extrakce textu přes pypdf
    - Text/kód → přímé přečtení obsahu
    """
    result = ProcessedFiles()
    if not files:
        return result

    text_parts = []

    for f in files:
        name = f.name
        mime = f.mime
        result.file_names.append(name)

        # Odstraníme data URI prefix (data:image/png;base64,...)
        raw_data = f.data
        if "," in raw_data:
            raw_data = raw_data.split(",", 1)[1]

        # --- OBRÁZKY → Vision ---
        if mime.startswith("image/"):
            result.has_images = True
            result.image_blocks.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime};base64,{raw_data}",
                    "detail": "high"
                }
            })

        # --- PDF → extrakce textu ---
        elif mime == "application/pdf" or name.lower().endswith(".pdf"):
            result.has_pdfs = True
            if PYPDF_AVAILABLE:
                try:
                    pdf_bytes = base64.b64decode(raw_data)
                    reader = PdfReader(io.BytesIO(pdf_bytes))
                    pages_text = []
                    for i, page in enumerate(reader.pages[:20]):  # max 20 stran
                        text = page.extract_text()
                        if text and text.strip():
                            pages_text.append(f"[Strana {i+1}]\n{text.strip()}")
                    if pages_text:
                        extracted = "\n\n".join(pages_text)
                        text_parts.append(
                            f"📄 PDF SOUBOR: {name} ({len(reader.pages)} stran)\n"
                            f"{'='*50}\n{extracted[:8000]}"
                            f"{'...[zkráceno]' if len(extracted) > 8000 else ''}"
                        )
                    else:
                        text_parts.append(f"📄 PDF SOUBOR: {name} — nepodařilo se extrahovat text (pravděpodobně skenovaný obrázek).")
                except Exception as e:
                    text_parts.append(f"📄 PDF SOUBOR: {name} — chyba při čtení: {str(e)}")
            else:
                text_parts.append(
                    f"📄 PDF SOUBOR: {name} — pypdf není nainstalován.\n"
                    f"Spusť: pip install pypdf"
                )

        # --- TEXTOVÉ SOUBORY / KÓD ---
        elif mime.startswith("text/") or any(name.endswith(ext) for ext in [
            ".py", ".js", ".ts", ".jsx", ".tsx", ".json", ".yaml", ".yml",
            ".md", ".txt", ".sh", ".bash", ".html", ".css", ".csv", ".xml",
            ".env", ".toml", ".ini", ".cfg", ".conf", ".log"
        ]):
            result.has_text = True
            try:
                decoded = base64.b64decode(raw_data).decode("utf-8", errors="replace")
                ext = name.rsplit(".", 1)[-1] if "." in name else "txt"
                text_parts.append(
                    f"📝 SOUBOR: {name}\n"
                    f"```{ext}\n{decoded[:6000]}"
                    f"{'...[zkráceno]' if len(decoded) > 6000 else ''}\n```"
                )
            except Exception as e:
                text_parts.append(f"📝 SOUBOR: {name} — chyba při čtení: {str(e)}")

        # --- OSTATNÍ ---
        else:
            text_parts.append(f"📎 PŘÍLOHA: {name} (typ: {mime}) — binární soubor, nelze zobrazit jako text.")

    result.text_summary = "\n\n".join(text_parts)
    return result


def build_human_message(text: str, processed: ProcessedFiles) -> HumanMessage:
    """
    Sestaví HumanMessage — buď prostý text, nebo multimodální
    obsah pro Vision (text + obrázky).
    """
    parts = []

    # Textová část zprávy uživatele
    full_text = text
    if processed.text_summary:
        full_text = f"{text}\n\n{processed.text_summary}" if text else processed.text_summary

    if full_text:
        parts.append({"type": "text", "text": full_text})

    # Obrazové bloky (Vision)
    parts.extend(processed.image_blocks)

    if len(parts) == 1 and parts[0]["type"] == "text":
        # Pouze text — prostý HumanMessage (kompatibilní se všemi modely)
        return HumanMessage(content=parts[0]["text"])
    elif parts:
        # Multimodální obsah
        return HumanMessage(content=parts)
    else:
        return HumanMessage(content=text or "(prázdná zpráva)")

# --- DOCKER & VECTOR DB ---
try:
    docker_client = docker.from_env()
except Exception:
    docker_client = None

vector_db = None
try:
    if not os.path.exists(CHROMA_PATH):
        os.makedirs(CHROMA_PATH)
    vector_db = Chroma(persist_directory=CHROMA_PATH, embedding_function=OpenAIEmbeddings())
except Exception:
    pass

# --- FASTAPI ---
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
    asyncio.create_task(system_monitor_loop())
    asyncio.create_task(night_analysis_loop())
    yield

app = FastAPI(title="Engineering AI Backend v9.2", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# =============================================================================
# BEZPEČNOST — API KEY MIDDLEWARE + RATE LIMITING
# =============================================================================

# Rate limiting — max požadavků za okno
import collections
_rate_buckets: dict = collections.defaultdict(list)
RATE_LIMIT_REQUESTS = 60   # max požadavků
RATE_LIMIT_WINDOW   = 60   # za N sekund

def _check_rate_limit(ip: str) -> bool:
    """Vrátí True pokud je požadavek v limitu, False pokud překročen."""
    now = time.time()
    bucket = _rate_buckets[ip]
    # Smaž staré záznamy
    _rate_buckets[ip] = [t for t in bucket if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_buckets[ip]) >= RATE_LIMIT_REQUESTS:
        return False
    _rate_buckets[ip].append(now)
    return True

# Sledování neúspěšných pokusů o autentizaci
_auth_failures: dict = collections.defaultdict(list)
AUTH_LOCKOUT_ATTEMPTS = 10   # po N neúspěších
AUTH_LOCKOUT_WINDOW   = 300  # na N sekund (5 minut)

def _is_locked_out(ip: str) -> bool:
    now = time.time()
    _auth_failures[ip] = [t for t in _auth_failures[ip] if now - t < AUTH_LOCKOUT_WINDOW]
    return len(_auth_failures[ip]) >= AUTH_LOCKOUT_ATTEMPTS

def _record_auth_failure(ip: str):
    _auth_failures[ip].append(time.time())

@app.middleware("http")
async def security_middleware(request: Request, call_next):
    ip = request.client.host if request.client else "unknown"
    path = request.url.path

    # Veřejné cesty — bez autentizace
    if path in PUBLIC_PATHS:
        return await call_next(request)

    # Rate limiting
    if not _check_rate_limit(ip):
        return JSONResponse(
            status_code=429,
            content={"detail": "Too Many Requests — zpomal."}
        )

    # Pokud není nastaven API_SECRET, autentizace je vypnutá (vývoj)
    if not API_SECRET:
        return await call_next(request)

    # Zkontroluj lockout
    if _is_locked_out(ip):
        return JSONResponse(
            status_code=403,
            content={"detail": "IP dočasně zablokována — příliš mnoho neúspěšných pokusů."}
        )

    # Ověř API klíč — z headeru X-API-Key nebo query parametru ?key=
    provided_key = (
        request.headers.get("X-API-Key") or
        request.query_params.get("key") or
        ""
    )

    if provided_key != API_SECRET:
        _record_auth_failure(ip)
        failures = len(_auth_failures[ip])
        remaining = AUTH_LOCKOUT_ATTEMPTS - failures
        return JSONResponse(
            status_code=401,
            content={
                "detail": "Neplatný API klíč.",
                "remaining_attempts": max(0, remaining)
            }
        )

    return await call_next(request)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "auth_enabled": bool(API_SECRET), "version": "9.2"}

# =============================================================================
# POST-TASK JOBS — quality scoring + Telegram (běží na pozadí)
# =============================================================================

async def _post_task_jobs(task_id: str, state: dict, query: str,
                          response: str, code: str, lang: str, model: str):
    """Spustí se po dokončení úkolu — quality scoring + Telegram notifikace."""
    await asyncio.sleep(0.5)  # nech stream dorazit na frontend

    # 1. Quality scoring (synchronní LLM call v threadu)
    score, reason = None, ""
    try:
        llm = build_llm(model)
        sys_msg = SystemMessage(content="""Jsi hodnotitel kvality AI výstupu.
Ohodnoť odpověď na škále 1-10 a stručně zdůvodni.
ODPOVĚZ POUZE TAKTO:
SCORE: <číslo>
REASON: <1 věta česky>""")
        eval_content = f"DOTAZ: {query[:400]}\n\nODPOVĚĎ: {response[:1500]}"
        result = llm.invoke([sys_msg, HumanMessage(content=eval_content)])
        for line in (result.content or "").splitlines():
            if line.startswith("SCORE:"):
                try: score = min(10.0, max(1.0, float(line.split(":",1)[1].strip())))
                except: pass
            elif line.startswith("REASON:"):
                reason = line.split(":",1)[1].strip()
        if score is not None:
            conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
            cur.execute('UPDATE task_history SET quality_score=?,quality_reason=? WHERE task_id=?',
                        (score, reason, task_id))
            conn.commit(); conn.close()
    except Exception: pass

    # 2. Telegram notifikace
    has_code = bool(code.strip())
    score_emoji = "🟢" if (score or 0) >= 7 else "🟡" if (score or 0) >= 5 else "🔴"
    quality_line = f"{score_emoji} Kvalita: *{score}/10* — {reason}" if score else ""
    short_query = query[:120] + ("..." if len(query) > 120 else "")
    msg = (f"✅ *Úkol dokončen*\n"
           f"❓ _{short_query}_\n"
           f"{'💾 Kód vygenerován (' + lang + ')' if has_code else '💬 Textová odpověď'}\n"
           f"{quality_line}")
    await telegram_notify(msg)

# =============================================================================
# NOČNÍ ANALÝZA — spouští se každou noc ve 02:00
# =============================================================================

async def night_analysis_loop():
    """Každou noc analyzuje chyby, trendy kvality a generuje doporučení."""
    while True:
        now = datetime.now()
        # Počkej do 02:00
        target = now.replace(hour=2, minute=0, second=0, microsecond=0)
        if now >= target:
            target = target.replace(day=target.day + 1)
        wait_secs = (target - now).total_seconds()
        await asyncio.sleep(wait_secs)

        await run_night_analysis()

async def run_night_analysis():
    """Provede analýzu posledních 24 hodin a uloží doporučení."""
    try:
        conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
        yesterday = (datetime.now().replace(hour=0, minute=0, second=0)
                     ).strftime("%Y-%m-%d")

        # Statistiky z posledního dne
        cur.execute('''SELECT COUNT(*), AVG(quality_score),
                       SUM(CASE WHEN quality_score < 5 THEN 1 ELSE 0 END),
                       GROUP_CONCAT(quality_reason, " | ")
                       FROM task_history
                       WHERE date >= ? AND quality_score IS NOT NULL''', (yesterday,))
        row = cur.fetchone()
        if not row or not row[0]:
            conn.close(); return

        total, avg_q, failed, reasons = row
        avg_q = round(avg_q or 0, 1)

        # Telemetrie za den
        cur.execute('''SELECT agent_id, SUM(cost_usd) FROM telemetry
                       WHERE date >= ? GROUP BY agent_id ORDER BY SUM(cost_usd) DESC LIMIT 5''',
                    (yesterday,))
        top_agents = cur.fetchall()
        conn.close()

        # Nech LLM vygenerovat doporučení
        llm = build_llm(ACTIVE_MODEL)
        analysis_prompt = f"""Jsi analytik AI systému. Analyzuj data za poslední den a vytvoř doporučení.

STATISTIKY (posledních 24h):
- Celkem úkolů: {total}
- Průměrná kvalita: {avg_q}/10
- Selhání (kvalita < 5): {failed}
- Nejdražší agenti: {', '.join(f'{a[0]}: ${a[1]:.4f}' for a in top_agents)}
- Problémy: {(reasons or '')[:800]}

Vytvoř:
1. TOP_ISSUES: 3 hlavní problémy (1 věta každý)
2. RECOMMENDATIONS: 3 konkrétní doporučení pro zlepšení
3. PROMPT_SUGGESTIONS: Navrhni konkrétní úpravy promptů pro nejproblematičtějšího agenta

Odpověz česky, strukturovaně."""

        result = llm.invoke([HumanMessage(content=analysis_prompt)])
        analysis_text = result.content or ""

        # Ulož do DB
        conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
        cur.execute('''INSERT INTO night_analysis
                       (date,total_tasks,avg_quality,failed_tasks,top_issues,recommendations,prompt_suggestions)
                       VALUES (?,?,?,?,?,?,?)''',
                    (datetime.now().isoformat(), total, avg_q, failed or 0,
                     analysis_text[:500], analysis_text[500:1000], analysis_text[1000:1500]))
        conn.commit(); conn.close()

        # Telegram shrnutí
        trend = "📈" if avg_q >= 7 else "📉" if avg_q < 5 else "➡️"
        await telegram_notify(
            f"🌙 *Noční analýza dokončena*\n"
            f"{trend} Průměrná kvalita: *{avg_q}/10*\n"
            f"📊 Úkolů: {total} | Selhání: {failed or 0}\n"
            f"💰 Celková cena: ${sum(a[1] for a in top_agents):.4f}\n"
            f"_Detaily v /api/night-analysis_"
        )
    except Exception as e:
        await telegram_notify(f"⚠️ Noční analýza selhala: {str(e)[:100]}")

# =============================================================================
# FRONTA ÚKOLŮ — batch zpracování
# =============================================================================

# Globální fronta — zpracovává se sekvenčně
_queue_processing = False

async def process_queue():
    """Zpracovává úkoly z fronty sekvenčně."""
    global _queue_processing
    if _queue_processing:
        return
    _queue_processing = True
    try:
        while True:
            conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
            cur.execute("SELECT id,message,model_id FROM task_queue WHERE status='pending' ORDER BY id LIMIT 1")
            row = cur.fetchone(); conn.close()
            if not row:
                break

            qid, message, model_id = row
            model_id = model_id or ACTIVE_MODEL

            # Označ jako zpracovávaný
            conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
            cur.execute("UPDATE task_queue SET status='running', started_at=? WHERE id=?",
                        (datetime.now().isoformat(), qid))
            conn.commit(); conn.close()

            # Telegram — start
            await telegram_notify(f"⚙️ *Fronta: spouštím úkol #{qid}*\n_{message[:100]}_")

            # Spusť přes pipeline
            result_text, result_code, result_lang = "", "", "python"
            try:
                task_id = f"queue_{qid}_{int(time.time())}"
                state = {
                    "messages": [HumanMessage(content=message)],
                    "iterations": 0, "status": "", "route": "",
                    "error_log": "", "plan": [], "current_step": -1,
                    "model_id": model_id, "task_id": task_id,
                    "project_specs": {}, "is_web_project": False,
                }
                history = []
                async for output in agent_app.astream(state):
                    for node, update in output.items():
                        if update and "messages" in update:
                            for m in update["messages"]:
                                if m and hasattr(m, "content") and m.content:
                                    history.append(str(m.content))

                if history:
                    result_text = history[-1]
                    for l in ["python","bash","html","javascript"]:
                        found = re.search(rf"{CB}{l}\n(.*?)\n{CB}", "\n".join(history), re.DOTALL)
                        if found:
                            result_code = found.group(1).strip()
                            result_lang = l; break
                    result_text = re.sub(rf"{CB}.*?{CB}", "", result_text, flags=re.DOTALL).strip()

                status = "done"
            except Exception as e:
                result_text = f"Chyba: {str(e)}"
                status = "failed"

            # Ulož výsledek
            conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
            cur.execute('''UPDATE task_queue SET status=?,result=?,code=?,lang=?,finished_at=?
                           WHERE id=?''',
                        (status, result_text, result_code, result_lang,
                         datetime.now().isoformat(), qid))
            conn.commit(); conn.close()

            # Telegram — hotovo
            emoji = "✅" if status == "done" else "❌"
            await telegram_notify(
                f"{emoji} *Fronta: úkol #{qid} dokončen*\n"
                f"_{message[:80]}_\n"
                f"{'💾 Kód: ' + result_lang if result_code else '💬 Textová odpověď'}"
            )

    finally:
        _queue_processing = False

# --- POMOCNÉ FUNKCE UZLŮ ---
def _llm(state: AgentState, with_tools: bool = False):
    llm = build_llm(state.get("model_id") or ACTIVE_MODEL)
    if with_tools:
        return llm.bind_tools([execute_linux_command, search_internet, git_operation])
    return llm

def _msgs(state: AgentState):
    return list(state["messages"])

# =============================================================================
# TELEMETRIE — ceny tokenů a tracking
# =============================================================================

# Ceny v USD za 1000 tokenů (input / output)
TOKEN_PRICES = {
    "gpt-4o-mini":       {"input": 0.000150, "output": 0.000600},
    "gpt-4o":            {"input": 0.002500, "output": 0.010000},
    "claude-sonnet-4-5": {"input": 0.003000, "output": 0.015000},
}

def calc_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    prices = TOKEN_PRICES.get(model, TOKEN_PRICES["gpt-4o-mini"])
    return round(
        (input_tokens / 1000) * prices["input"] +
        (output_tokens / 1000) * prices["output"],
        6
    )

def save_telemetry(task_id: str, agent_id: str, model: str,
                   input_tokens: int, output_tokens: int, duration_ms: int):
    """Uloží telemetrická data do SQLite."""
    cost = calc_cost(model, input_tokens, output_tokens)
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute(
            'INSERT INTO telemetry (task_id,agent_id,model,input_tokens,output_tokens,cost_usd,duration_ms,date) '
            'VALUES (?,?,?,?,?,?,?,?)',
            (task_id, agent_id, model, input_tokens, output_tokens, cost,
             duration_ms, datetime.now().isoformat())
        )
        conn.commit(); conn.close()
    except Exception:
        pass

def extract_usage(response) -> tuple[int, int]:
    """Extrahuje počet tokenů z AIMessage — funguje pro OpenAI i Claude."""
    meta = getattr(response, "usage_metadata", None)
    if meta:
        return meta.get("input_tokens", 0), meta.get("output_tokens", 0)
    # Fallback pro starší verze LangChain
    resp_meta = getattr(response, "response_metadata", {})
    usage = resp_meta.get("token_usage") or resp_meta.get("usage") or {}
    inp = usage.get("prompt_tokens") or usage.get("input_tokens") or 0
    out = usage.get("completion_tokens") or usage.get("output_tokens") or 0
    return inp, out

def _llm_tracked(state: AgentState, agent_id: str, with_tools: bool = False):
    """
    Wrapper kolem _llm — vrátí funkci invoke() která automaticky
    trackuje tokeny a ukládá telemetrii do SQLite.
    """
    llm = build_llm(state.get("model_id") or ACTIVE_MODEL)
    if with_tools:
        llm = llm.bind_tools([execute_linux_command, search_internet, git_operation])
    model = state.get("model_id") or ACTIVE_MODEL
    task_id = state.get("task_id", "unknown")

    class TrackedLLM:
        def invoke(self, messages):
            t0 = time.time()
            response = llm.invoke(messages)
            duration_ms = int((time.time() - t0) * 1000)
            inp, out = extract_usage(response)
            if inp > 0 or out > 0:
                save_telemetry(task_id, agent_id, model, inp, out, duration_ms)
            return response

    return TrackedLLM()

# --- UZLY GRAFU ---

WEB_KEYWORDS = ["eshop", "e-shop", "web", "website", "stránk", "stránky", "landing", "portfolio",
                "blog", "obchod", "prodej", "frontend", "html", "tailwind", "react app", "aplikaci"]

def manazer_node(state: AgentState):
    query = str(state["messages"][-1].content if state["messages"] else "").lower()
    is_web = any(w in query for w in WEB_KEYWORDS)

    sys_msg = SystemMessage(content=team_identity_with_context("MANAZER") + """
    Zvol trasu:
    - [ROUTE:PLANNER] pro velké projekty (e-shopy, komplexní aplikace, weby).
    - [ROUTE:LINUX] pro terminál, bash, Git a HW.
    - [ROUTE:WEB] pro aktuální vyhledávání.
    - [ROUTE:EXPERT] pro manuály, fotky nebo obecné dotazy.
    - [ROUTE:PYTHON] pro skripty a algoritmy.
    """)
    response = _llm_tracked(state, "MANAZER").invoke([sys_msg] + _msgs(state))
    route_upper = (response.content or "").upper()

    if is_web or any(w in query for w in ["projekt", "aplikac", "systém"]): route = "Planner"
    elif "[ROUTE:PLANNER]" in route_upper: route = "Planner"
    elif "[ROUTE:LINUX]"   in route_upper: route = "SysAdmin"
    elif "[ROUTE:WEB]"     in route_upper: route = "Vyzkumnik"
    elif "[ROUTE:EXPERT]"  in route_upper: route = "Expert"
    else:                                   route = "Architekt"

    return {
        "messages": [AIMessage(content=f"Deleguji úkol na uzel: {route}")],
        "route": route,
        "is_web_project": is_web,
    }

def designer_node(state: AgentState):
    """Webový Designer — specializovaný agent pro moderní UI/UX s Tailwind CSS."""
    specs = state.get("project_specs", {})
    specs_text = ""
    if specs:
        specs_text = "\n\nSPECIFIKACE OD KELNAPEHO:\n" + "\n".join(
            f"• {k}: {v}" for k, v in specs.items() if v
        )

    plan_info = ""
    if state.get("plan") and 0 <= state["current_step"] < len(state["plan"]):
        plan_info = f"\nAKTUÁLNÍ KROK: {state['plan'][state['current_step']]}"

    sys_msg = SystemMessage(content=team_identity_with_context("DESIGNER") + f"""
    Jsi Webový Designer — expert na moderní UI/UX.

    TVOJE PRAVIDLA:
    1. Používej VÝHRADNĚ Tailwind CSS (CDN) — žádný vlastní CSS pokud není nezbytný.
    2. Piš KOMPLETNÍ, funkční HTML soubor (vše v jednom — HTML + Tailwind + JS).
    3. Design musí být PROFESIONÁLNÍ — gradient pozadí, karty se stíny, hover efekty.
    4. Zahrň: hero sekci, navigaci, responsivní layout (mobile-first).
    5. Přidej JS pro interaktivitu (košík, menu, animace).
    6. Komentuj sekce v kódu pro snadnou editaci.
    7. Na konci přidej krátký README jak stránku spustit.
    {specs_text}
    {plan_info}

    VÝSTUP: Jeden kompletní ```html blok.
    """)
    return {
        "messages": [_llm_tracked(state, "DESIGNER").invoke([sys_msg] + _msgs(state))],
        "status": "AUDIT"
    }

def planner_node(state: AgentState):
    sys_msg = SystemMessage(content=team_identity_with_context("PLANNER") + """
    Jsi Technický Plánovač. Rozlož zadání na DETAILNÍ kroky.
    PRAVIDLA: 5–10 kroků, technicky specifické, zahrň Rešerši/Arch/Impl/Test/Docs.
    ODPOVĚZ POUZE VALIDNÍM JSON POLEM ŘETĚZCŮ.
    """)
    response = _llm_tracked(state, "PLANNER").invoke([sys_msg] + _msgs(state))
    try:
        plan_str = re.sub(r"```json|```", "", response.content or "").strip()
        plan = json.loads(plan_str)
        if not isinstance(plan, list) or len(plan) < 2: raise ValueError()
    except Exception:
        plan = ["Analýza požadavků","Návrh architektury","Příprava prostředí",
                "Implementace jádra","Vývoj UI","Audit","Docker Testování","Dokumentace"]
    return {"messages": [AIMessage(content="Plán sestaven.")], "plan": plan, "current_step": 0}

def next_step_node(state: AgentState):
    next_idx = state.get("current_step", 0) + 1
    plan = state.get("plan", [])
    if next_idx < len(plan):
        return {"current_step": next_idx,
                "messages": [HumanMessage(content=f"[PLÁNOVAČ]: Implementuj: {plan[next_idx]}")],
                "iterations": 0, "status": "", "error_log": ""}
    return {"route": "FINISH"}

def sysadmin_node(state: AgentState):
    # Získej živý Git status pro kontext
    git_status, _ = _git_run(["status", "--short", "--branch"])
    git_remote, _ = _git_run(["remote", "-v"])
    git_branch, _ = _git_run(["branch", "--show-current"])

    sys_msg = SystemMessage(content=team_identity_with_context("SYSADMIN") + f"""
Jsi Senior SysAdmin a Git specialista pro projekt Engineering AI System.

PROSTŘEDÍ:
- Server: Ubuntu (x86_64), uživatel: kelnape
- Projekt: ~/moje_prostredi/
- Backend: ~/moje_prostredi/main.py  (FastAPI + LangGraph, port 8000)
- Frontend: ~/moje_prostredi/frontend/  (React + Vite, port 5173)
- Virtualenv: ~/moje_prostredi/.venv/
- Git repozitář: {GIT_REPO_PATH}

GIT STAV (aktuální):
Větev: {git_branch.strip()}
Status:
{git_status}
Remote:
{git_remote}

TVOJE GIT NÁSTROJE — VŽDY POUŽÍVEJ git_operation():
- git_operation("status")          → stav repozitáře
- git_operation("log")             → historie commitů
- git_operation("diff")            → co se změnilo
- git_operation("add")             → přidej vše do stage
- git_operation("commit", message="zpráva")  → vytvoř commit
- git_operation("push")            → push na remote
- git_operation("pull")            → pull z remote
- git_operation("branch")          → seznam větví
- git_operation("checkout", branch="nazev") → přepni větev

GIT WORKFLOW PRO COMMIT+PUSH:
1. git_operation("status") — zjisti co se změnilo
2. git_operation("add") — přidej soubory
3. git_operation("commit", message="popis změn") — commitni
4. git_operation("push") — pushni na GitHub

PRAVIDLA:
- Pro commit zprávy používej konvenci: feat/fix/chore/docs: popis
- Nikdy force-push bez explicitního pokynu
- Před pushem vždy zkontroluj status
- Pro systémové příkazy (restart, monitoring) používej execute_linux_command()
- Systemd: systemctl status/start/stop/restart engineering-ai
- Logy backendu: journalctl -u engineering-ai -f
""")
    ai_resp = _llm_tracked(state, "SYSADMIN", with_tools=True).invoke([sys_msg] + _msgs(state))
    tool_results = execute_tool_calls(ai_resp)
    if tool_results:
        followup = _llm_tracked(state, "SYSADMIN").invoke([sys_msg] + _msgs(state) + [ai_resp] + tool_results)
        return {"messages": [ai_resp] + tool_results + [followup], "status": "DONE"}
    return {"messages": [ai_resp], "status": "DONE"}

def vyzkumnik_node(state: AgentState):
    sys_msg = SystemMessage(content=team_identity_with_context("VYZKUMNIK") + "Jsi Výzkumník. Hledej přes search_internet.")
    ai_resp = _llm_tracked(state, "VYZKUMNIK", with_tools=True).invoke([sys_msg] + _msgs(state))
    tool_results = execute_tool_calls(ai_resp)
    if tool_results:
        followup = _llm_tracked(state, "VYZKUMNIK").invoke([sys_msg] + _msgs(state) + [ai_resp] + tool_results)
        return {"messages": [ai_resp] + tool_results + [followup], "status": "DONE"}
    return {"messages": [ai_resp], "status": "DONE"}

def expert_node(state: AgentState):
    kontext = ""
    last_msg = state["messages"][-1] if state["messages"] else None
    last_content = ""
    if last_msg:
        c = last_msg.content
        if isinstance(c, list):
            last_content = " ".join(p.get("text","") for p in c if isinstance(p, dict) and p.get("type")=="text")
        else:
            last_content = str(c)
    if vector_db and last_content:
        docs = vector_db.similarity_search(last_content, k=3)
        kontext = "\nZNALOSTI Z KNIHOVNY:\n" + "\n".join([d.page_content for d in docs])
    sys_msg = SystemMessage(content=team_identity_with_context("EXPERT") + f"""
    Jsi Expert na analýzu dokumentů, obrázků a technických manuálů.
    Pokud byla přiložena příloha (PDF, obrázek, soubor), analyzuj ji podrobně.
    Odpověz technicky přesně a strukturovaně.
    {kontext}
    """)
    return {"messages": [_llm_tracked(state, "EXPERT").invoke([sys_msg] + _msgs(state))], "status": "DONE"}

def architekt_node(state: AgentState):
    # Webové projekty jdou na Designera
    if state.get("is_web_project"):
        return designer_node(state)

    specs = state.get("project_specs", {})
    specs_text = ("\n\nSPECIFIKACE:\n" + "\n".join(f"• {k}: {v}" for k, v in specs.items() if v)) if specs else ""

    pravidla = ""
    if vector_db:
        docs = vector_db.similarity_search("ZLATÉ PRAVIDLO DOCKER PYTEST CHYBA", k=3)
        p = [d.page_content for d in docs if "ZLATÉ PRAVIDLO" in d.page_content]
        if p: pravidla = "\n!!! POUČENÍ Z CHYB !!!\n" + "\n".join(p)

    plan_info = ""
    if state.get("plan") and 0 <= state["current_step"] < len(state["plan"]):
        plan_info = f"\nKROK ({state['current_step']+1}/{len(state['plan'])}): {state['plan'][state['current_step']]}"

    sys_msg = SystemMessage(content=team_identity_with_context("ARCHITEKT") + f"""
    Jsi Architekt. Navrhni kód — použij {CB}python, {CB}bash nebo {CB}html podle kontextu.
    {plan_info}{pravidla}{specs_text}
    """)
    return {"messages": [_llm_tracked(state, "ARCHITEKT").invoke([sys_msg] + _msgs(state))], "status": "AUDIT"}

def auditor_node(state: AgentState):
    last_msg = next((str(m.content) for m in reversed(state["messages"]) if m.content and CB in str(m.content)), "")
    if not last_msg:
        return {"messages": [AIMessage(content="⚠️ Kód k auditu nenalezen.")], "status": "PASS"}
    sys_msg = SystemMessage(content=team_identity_with_context("AUDITOR") + "Zkontroluj kód. Odpověz PASS nebo FAIL + chyby.")
    res = _llm_tracked(state, "AUDITOR").invoke([sys_msg, HumanMessage(content=last_msg)])
    status = "PASS" if "PASS" in (res.content or "").upper() else "FAIL"
    error_log = state.get("error_log", "")
    if status == "FAIL": error_log += f"\n[Auditor]: {res.content}"
    return {"messages": [res], "status": status, "error_log": error_log}

def tester_node(state: AgentState):
    if state["status"] == "FAIL":
        return {"status": "FAIL", "messages": [AIMessage(content="⚠️ Tester přeskočen — Auditor hlásí FAIL.")]}
    if not docker_client:
        return {"status": "PASS", "messages": [AIMessage(content="ℹ️ Docker nedostupný, testování přeskočeno.")]}
    match = next((re.search(rf"{CB}python\n(.*?)\n{CB}", str(m.content), re.DOTALL)
                  for m in reversed(state["messages"]) if m.content), None)
    if not match:
        return {"status": "PASS", "messages": [AIMessage(content="ℹ️ Žádný Python kód k testování.")]}
    kod = match.group(1)
    try:
        cmd = f"pip install pytest > /dev/null 2>&1 && python3 -c '{kod.replace(chr(39), chr(34))}'"
        res = docker_client.containers.run("python:3.10-slim", f"sh -c \"{cmd}\"", remove=True, timeout=30)
        return {"messages": [AIMessage(content=f"✅ Docker OK:\n{res.decode()}")], "status": "PASS"}
    except Exception as e:
        error_log = state.get("error_log", "") + f"\n[Docker]: {str(e)}"
        return {"messages": [AIMessage(content=f"❌ Docker selhal: {str(e)}")], "status": "FAIL", "error_log": error_log}

def koder_node(state: AgentState):
    return {"messages": [_llm_tracked(state, "KODER").invoke(
        [SystemMessage(content=team_identity_with_context("KODER") + "Oprav chyby z logu: " + state.get("error_log", ""))]
        + _msgs(state))], "iterations": state.get("iterations", 0) + 1}

def reflektor_node(state: AgentState):
    if not state.get("error_log", "").strip():
        return {"messages": [AIMessage(content="🧠 Bez nutnosti reflexe.")], "status": "DONE"}
    sys_msg = SystemMessage(content=team_identity_with_context("REFLEKTOR") + "Analyzuj chyby a vytvoř 'ZLATÉ PRAVIDLO:'.")
    res = _llm_tracked(state, "REFLEKTOR").invoke([sys_msg, HumanMessage(content=f"Chyby:\n{state['error_log']}")])
    if vector_db:
        vector_db.add_texts([res.content], metadatas=[{"type": "rule", "date": datetime.now().isoformat()}])
    return {"messages": [AIMessage(content=f"🧠 [SEBEREFLEXE]: {res.content}")], "status": "DONE"}

def finalizer_node(state: AgentState):
    sys_msg = SystemMessage(content=team_identity_with_context("FINALIZER") + "Sestav závěrečné shrnutí pro Kelnapeho.")
    return {"messages": [_llm_tracked(state, "FINALIZER").invoke([sys_msg] + _msgs(state)[-3:])]}

def quality_node(state: AgentState) -> dict:
    """
    Hodnotí kvalitu výstupu na škále 1-10.
    Ukládá skóre + zdůvodnění do SQLite.
    Spouští se asynchronně po finalizaci — netlačí uživatele.
    """
    try:
        last_response = ""
        for m in reversed(state["messages"]):
            if hasattr(m, "content") and m.content and isinstance(m.content, str):
                last_response = m.content[:2000]
                break
        if not last_response:
            return {}

        original_query = ""
        for m in state["messages"]:
            if hasattr(m, "content") and isinstance(m.content, str):
                original_query = m.content[:500]
                break

        sys_msg = SystemMessage(content="""Jsi hodnotitel kvality AI výstupu.
Ohodnoť následující odpověď na škále 1-10 a stručně zdůvodni.

Kritéria hodnocení:
- 9-10: Perfektní, přesné, kompletní, funkční
- 7-8: Dobré, drobné nedostatky
- 5-6: Průměrné, chybí detaily nebo má chyby
- 3-4: Slabé, neúplné nebo nepřesné
- 1-2: Nevyhovující, špatně zodpovězené

ODPOVĚZ POUZE V TOMTO FORMÁTU (bez ničeho jiného):
SCORE: <číslo 1-10>
REASON: <1-2 věty česky>
""")
        eval_msg = HumanMessage(content=f"DOTAZ: {original_query}\n\nODPOVĚĎ: {last_response}")
        llm = build_llm(state.get("model_id") or ACTIVE_MODEL)
        result = llm.invoke([sys_msg, eval_msg])

        score, reason = None, ""
        for line in (result.content or "").splitlines():
            if line.startswith("SCORE:"):
                try: score = float(line.split(":", 1)[1].strip())
                except: pass
            elif line.startswith("REASON:"):
                reason = line.split(":", 1)[1].strip()

        if score is not None:
            task_id = state.get("task_id", "")
            try:
                conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
                cur.execute('UPDATE task_history SET quality_score=?, quality_reason=? WHERE task_id=?',
                            (score, reason, task_id))
                conn.commit(); conn.close()
            except Exception: pass
    except Exception:
        pass
    return {}

# --- SESTAVA GRAFU ---
workflow = StateGraph(AgentState)
for name, fn in [
    ("Manazer", manazer_node), ("Planner", planner_node), ("Vyzkumnik", vyzkumnik_node),
    ("Expert", expert_node), ("SysAdmin", sysadmin_node), ("Architekt", architekt_node),
    ("Designer", designer_node), ("Auditor", auditor_node), ("Tester", tester_node),
    ("Koder", koder_node), ("Reflektor", reflektor_node),
    ("Nextstep", next_step_node), ("Finalizer", finalizer_node)
]:
    workflow.add_node(name, fn)

workflow.set_entry_point("Manazer")
workflow.add_conditional_edges("Manazer", lambda s: s["route"],
    {"Planner":"Planner","Architekt":"Architekt","Expert":"Expert","SysAdmin":"SysAdmin","Vyzkumnik":"Vyzkumnik"})
workflow.add_edge("Planner","Architekt"); workflow.add_edge("Vyzkumnik","Finalizer")
workflow.add_edge("Expert","Finalizer"); workflow.add_edge("SysAdmin","Finalizer")
workflow.add_edge("Architekt","Auditor")
workflow.add_conditional_edges("Auditor",
    lambda s: "Tester" if s["status"]=="PASS" or s.get("iterations",0)>=3 else "Koder",
    {"Tester":"Tester","Koder":"Koder"})
workflow.add_conditional_edges("Tester",
    lambda s: "Reflektor" if s["status"]=="PASS" or s.get("iterations",0)>=3 else "Koder",
    {"Reflektor":"Reflektor","Koder":"Koder"})
workflow.add_edge("Koder","Auditor")
workflow.add_conditional_edges("Reflektor",
    lambda s: "Nextstep" if s.get("plan") and s.get("current_step",-1) < len(s["plan"])-1 else "Finalizer",
    {"Nextstep":"Nextstep","Finalizer":"Finalizer"})
workflow.add_edge("Nextstep","Architekt"); workflow.add_edge("Finalizer",END)
agent_app = workflow.compile()

# =============================================================================
# PYDANTIC MODELY
# =============================================================================
class FileData(BaseModel):
    name: str; type: str; mime: str; data: str

class ChatRequest(BaseModel):
    message: str
    files: Optional[list[FileData]] = []
    model_id: Optional[str] = None
    project_specs: Optional[dict] = {}       # intake formulář
    current_editor_code: Optional[str] = ""  # aktuální kód v editoru
    current_editor_lang: Optional[str] = ""  # jazyk editoru

class LearnRequest(BaseModel):
    query: str
    code: str = ""
    type: str = "user_learn"  # user_learn | golden_rule
    agent: str = ""

class ModelRequest(BaseModel):
    model_id: str

class AgentPromptRequest(BaseModel):
    agent_id: str; prompt: str

# =============================================================================
# API ENDPOINTY
# =============================================================================

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    async def stream():
        global SESSION_HISTORY
        model_id = request.model_id or ACTIVE_MODEL

        # --- ZPRACOVÁNÍ SOUBORŮ ---
        processed = process_files(request.files or [])

        # Pokud jsou přiloženy obrázky a model není Vision-capable, přepneme na gpt-4o
        effective_model = model_id
        if processed.has_images and model_id == "gpt-4o-mini":
            effective_model = "gpt-4o"
            yield json.dumps({"type": "info", "message": "📸 Obrázek detekován — přepínám na GPT-4o Vision"}) + "\n"

        # Sestavení zprávy s přílohami + kontextem editoru
        editor_ctx = ""
        if request.current_editor_code and request.current_editor_code.strip():
            lang = request.current_editor_lang or "code"
            lines = request.current_editor_code.strip().splitlines()
            # Přidáme jen pokud zpráva odkazuje na kód nebo je to editační dotaz
            edit_keywords = ["oprav", "uprav", "změň", "přidej", "smaž", "refaktor",
                             "vylepši", "fix", "kód", "funkc", "třída", "import",
                             "řádek", "chyb", "error", "bug", "doplň", "zkrať"]
            msg_lower = request.message.lower()
            if any(w in msg_lower for w in edit_keywords) or len(lines) == 0:
                editor_ctx = (f"\n\n--- KÓD V EDITORU ({lang}, {len(lines)} řádků) ---\n"
                             f"```{lang}\n{request.current_editor_code.strip()}\n```\n---")

        full_message = request.message + editor_ctx
        human_msg = build_human_message(full_message, processed)

        # Pokud jsou soubory, pošleme frontend informaci o zpracování
        if processed.file_names:
            file_info = ", ".join(processed.file_names)
            types = []
            if processed.has_images: types.append(f"{len(processed.image_blocks)} obrázek/ů")
            if processed.has_pdfs:   types.append("PDF")
            if processed.has_text:   types.append("textový soubor")
            yield json.dumps({
                "type": "files_processed",
                "files": processed.file_names,
                "summary": f"Zpracovány přílohy: {', '.join(types)} ({file_info})"
            }) + "\n"

        try:
            task_id = datetime.now().strftime("%Y%m%d_%H%M%S_") + str(abs(hash(request.message)) % 10000)
            specs = request.project_specs or {}
            is_web = bool(specs) or any(w in request.message.lower() for w in WEB_KEYWORDS)
            initial_state = {
                "messages": SESSION_HISTORY + [human_msg],
                "iterations": 0, "status": "",
                "route": "Expert" if (processed.has_pdfs or processed.has_text) and not processed.has_images else "",
                "error_log": "", "plan": [], "current_step": -1,
                "model_id": effective_model,
                "task_id": task_id,
                "project_specs": specs,
                "is_web_project": is_web,
            }
            history_contents = []
            async for output in agent_app.astream(initial_state):
                for node, update in output.items():
                    if update is None: continue
                    if node == "Planner":
                        yield json.dumps({"type": "plan", "tasks": update.get("plan", [])}) + "\n"
                    if node == "Nextstep":
                        yield json.dumps({"type": "plan_progress", "step_index": update["current_step"]}) + "\n"
                    yield json.dumps({"type": "progress", "node": node}) + "\n"
                    if "messages" in update and update["messages"]:
                        for m in update["messages"]:
                            if m and hasattr(m, "content") and m.content:
                                # Pro multimodální zprávy extrahujeme jen text část
                                content = m.content
                                if isinstance(content, list):
                                    content = " ".join(
                                        p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text"
                                    )
                                if content:
                                    history_contents.append(content)

            final_raw = str(history_contents[-1]) if history_contents else "Úkol dokončen."

            # Detekce jazyka kódu
            code, lang = "", "python"
            for m in reversed(history_contents):
                for l in ["python", "bash", "html", "javascript", "json"]:
                    found = re.search(rf"{CB}{l}\n(.*?)\n{CB}", str(m), re.DOTALL)
                    if found: code = found.group(1).strip(); lang = l; break
                if code: break

            clean_text = re.sub(rf"{CB}.*?{CB}", "", final_raw, flags=re.DOTALL).strip()

            try:
                conn = sqlite3.connect(DB_PATH); c = conn.cursor()
                c.execute('INSERT INTO task_history (task_id,query,response,code,date,model) VALUES (?,?,?,?,?,?)',
                          (task_id, request.message, clean_text, code,
                           datetime.now().strftime("%H:%M:%S"), model_id))
                conn.commit(); conn.close()
            except Exception: pass

            SESSION_HISTORY.append(HumanMessage(content=request.message))
            SESSION_HISTORY.append(AIMessage(content=clean_text))
            SESSION_HISTORY = SESSION_HISTORY[-(MAX_HISTORY * 2):]

            yield json.dumps({"type": "final", "response": clean_text, "code": code,
                              "lang": lang, "date": datetime.now().strftime("%H:%M:%S"),
                              "model": model_id, "task_id": task_id}) + "\n"

            # Quality scoring + Telegram — na pozadí, neblokuje stream
            asyncio.create_task(_post_task_jobs(
                task_id=task_id, state=initial_state,
                query=request.message, response=clean_text,
                code=code, lang=lang, model=model_id
            ))
        except Exception as e:
            yield json.dumps({"type": "error", "message": f"Serverová chyba: {str(e)}"}) + "\n"

    return StreamingResponse(stream(), media_type="text/event-stream")

@app.get("/api/history")
async def get_history():
    try:
        conn = sqlite3.connect(DB_PATH); c = conn.cursor()
        c.execute('SELECT query,response,code,date,model FROM task_history ORDER BY id DESC LIMIT 20')
        rows = c.fetchall(); conn.close()
        return [{"query":r[0],"response":r[1],"code":r[2],"date":r[3],"model":r[4],"hasCode":bool(r[2])} for r in rows]
    except Exception: return []

@app.get("/api/alerts")
async def get_alerts(): return {"alerts": SYSTEM_ALERTS}

@app.get("/api/metrics")
async def get_metrics():
    try:
        cpu = psutil.cpu_percent(interval=0.5)
        mem = psutil.virtual_memory()
        ram = f"{mem.used/1024**3:.1f} / {mem.total/1024**3:.1f} GB"
        temp = "N/A"
        p = "/sys/class/thermal/thermal_zone0/temp"
        if os.path.exists(p):
            with open(p) as f: temp = f"{int(f.read().strip())/1000:.1f}°C"
        us = int(time.time() - psutil.boot_time())
        uptime = f"{us//86400}D {(us%86400)//3600}H"
        return {"cpu":f"{cpu}%","ram":ram,"temp":temp,"docker":"ACTIVE" if docker_client else "OFFLINE","uptime":uptime}
    except Exception:
        return {"cpu":"0%","ram":"0/0 GB","temp":"N/A","docker":"OFFLINE","uptime":"N/A"}

@app.post("/api/learn")
async def learn_endpoint(request: LearnRequest):
    if not vector_db:
        raise HTTPException(status_code=503, detail="VectorDB není dostupná.")
    try:
        agent_label = f" [{request.agent}]" if request.agent else ""
        content = f"ZLATÉ PRAVIDLO{agent_label}\nÚkol: {request.query}\nŘešení:\n{request.code}"
        vector_db.add_texts(
            [content],
            metadatas=[{
                "type": request.type,
                "agent": request.agent,
                "source": "user_learn",
                "date": datetime.now().isoformat()
            }]
        )
        return {"status": "ok", "message": "✅ Znalost uložena do ChromaDB."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/memory")
async def get_memory():
    """Vrátí seznam všech vzpomínek z ChromaDB."""
    if not vector_db:
        return []
    try:
        col = vector_db._collection
        result = col.get(include=["documents", "metadatas"])
        memories = []
        for i, (doc, meta) in enumerate(zip(result["documents"], result["metadatas"])):
            memories.append({
                "id": result["ids"][i],
                "content": doc,
                "type": meta.get("type", "user_learn"),
                "agent": meta.get("agent", ""),
                "date": meta.get("date", ""),
            })
        memories.sort(key=lambda x: x["date"], reverse=True)
        return memories
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/memory/{memory_id}")
async def delete_memory(memory_id: str):
    """Smaže konkrétní vzpomínku z ChromaDB."""
    if not vector_db:
        raise HTTPException(status_code=503, detail="VectorDB není dostupná.")
    try:
        vector_db._collection.delete(ids=[memory_id])
        return {"status": "ok", "deleted": memory_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- TELEMETRIE ---
@app.get("/api/telemetry")
async def get_telemetry(limit: int = 10):
    """Vrátí telemetrii posledních N úkolů — tokeny a cena per agent."""
    try:
        conn = sqlite3.connect(DB_PATH); c = conn.cursor()
        c.execute('SELECT DISTINCT task_id FROM telemetry ORDER BY MIN(date) DESC LIMIT ?', (limit,))
        task_ids = [r[0] for r in c.fetchall()]
        if not task_ids:
            conn.close()
            return {"tasks": [], "totals": {"input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0}}
        ph = ",".join("?" * len(task_ids))
        c.execute(f'''
            SELECT task_id, agent_id, model,
                   SUM(input_tokens), SUM(output_tokens), SUM(cost_usd), SUM(duration_ms), MIN(date)
            FROM telemetry WHERE task_id IN ({ph})
            GROUP BY task_id, agent_id ORDER BY MIN(date) DESC
        ''', task_ids)
        rows = c.fetchall()
        c.execute('SELECT SUM(input_tokens), SUM(output_tokens), SUM(cost_usd) FROM telemetry')
        totals_row = c.fetchone(); conn.close()
        tasks_map = {}
        for task_id, agent_id, model, inp, out, cost, dur, date in rows:
            if task_id not in tasks_map:
                tasks_map[task_id] = {"task_id": task_id, "date": date, "model": model,
                                       "agents": [], "total_input": 0, "total_output": 0,
                                       "total_cost": 0.0, "total_ms": 0}
            tasks_map[task_id]["agents"].append({
                "agent_id": agent_id, "input_tokens": inp or 0,
                "output_tokens": out or 0, "cost_usd": round(cost or 0, 6), "duration_ms": dur or 0,
            })
            tasks_map[task_id]["total_input"]  += inp or 0
            tasks_map[task_id]["total_output"] += out or 0
            tasks_map[task_id]["total_cost"]   += cost or 0
            tasks_map[task_id]["total_ms"]     += dur or 0
        tasks = list(tasks_map.values())
        for t in tasks: t["total_cost"] = round(t["total_cost"], 6)
        return {"tasks": tasks,
                "totals": {"input_tokens": int(totals_row[0] or 0),
                           "output_tokens": int(totals_row[1] or 0),
                           "cost_usd": round(float(totals_row[2] or 0), 4)}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/telemetry")
async def clear_telemetry():
    try:
        conn = sqlite3.connect(DB_PATH); conn.cursor().execute('DELETE FROM telemetry')
        conn.commit(); conn.close()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AnalyzeRequest(BaseModel):
    files: list[FileData]
    question: str = "Analyzuj tento soubor a shrň co obsahuje."
    model_id: Optional[str] = None

@app.post("/api/analyze")
async def analyze_endpoint(request: AnalyzeRequest):
    """
    Rychlá analýza souborů bez spuštění celého agentního pipeline.
    Ideální pro rychlý náhled PDF/obrázku před zadáním úkolu.
    """
    async def stream():
        model_id = request.model_id or ACTIVE_MODEL
        processed = process_files(request.files)

        if not processed.file_names:
            yield json.dumps({"type": "error", "message": "Žádné soubory k analýze."}) + "\n"
            return

        # Vision modely pro obrázky
        effective_model = model_id
        if processed.has_images and model_id == "gpt-4o-mini":
            effective_model = "gpt-4o"

        human_msg = build_human_message(request.question, processed)

        sys_msg = SystemMessage(content="""
        Jsi analytický expert. Tvým úkolem je důkladně analyzovat přiložený soubor.

        PRO OBRÁZKY: Popiš co vidíš — objekty, text, schémata, grafy, kód, diagramy.
        Pokud jde o technický diagram nebo schéma, vysvětli architekturu a komponenty.

        PRO PDF: Shrň hlavní obsah, klíčové body, tabulky a strukturu dokumentu.
        Pokud jde o technický manuál, zdůrazni důležité postupy a parametry.

        PRO KÓD/TEXT: Analyzuj strukturu, účel, závislosti a případné problémy.

        Odpovídej česky, strukturovaně s nadpisy. Buď konkrétní a technicky přesný.
        """)

        try:
            llm = build_llm(effective_model)
            response = llm.invoke([sys_msg, human_msg])
            content = response.content
            if isinstance(content, list):
                content = " ".join(p.get("text","") for p in content if isinstance(p,dict) and p.get("type")=="text")
            yield json.dumps({
                "type": "analysis_complete",
                "result": content,
                "files": processed.file_names,
                "model": effective_model,
                "has_images": processed.has_images,
                "has_pdfs": processed.has_pdfs,
            }) + "\n"
        except Exception as e:
            yield json.dumps({"type": "error", "message": f"Chyba analýzy: {str(e)}"}) + "\n"

    return StreamingResponse(stream(), media_type="text/event-stream")

# --- MODELY ---
@app.get("/api/models")
async def get_models():
    return {
        "active": ACTIVE_MODEL,
        "available": [
            {"id": mid, "label": info["label"], "provider": info["provider"],
             "available": info["provider"] != "anthropic" or (ANTHROPIC_AVAILABLE and bool(os.getenv("ANTHROPIC_API_KEY")))}
            for mid, info in AVAILABLE_MODELS.items()
        ]
    }

@app.post("/api/model")
async def set_model(request: ModelRequest):
    global ACTIVE_MODEL
    if request.model_id not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail=f"Neznámý model: {request.model_id}")
    info = AVAILABLE_MODELS[request.model_id]
    if info["provider"] == "anthropic":
        if not ANTHROPIC_AVAILABLE:
            raise HTTPException(status_code=503, detail="Spusť: pip install langchain-anthropic")
        if not os.getenv("ANTHROPIC_API_KEY"):
            raise HTTPException(status_code=503, detail="Chybí ANTHROPIC_API_KEY v .env")
    ACTIVE_MODEL = request.model_id
    return {"status":"ok","active":ACTIVE_MODEL,"label":info["label"]}

# --- VLASTNÍ PROMPTY ---
@app.get("/api/prompts")
async def get_prompts():
    return {
        "base_identity": BASE_TEAM_IDENTITY.strip(),
        "agent_prompts": load_agent_prompts(),
        "agents": [
            {"id":"MANAZER","label":"Manažer"},{"id":"PLANNER","label":"Plánovač"},
            {"id":"VYZKUMNIK","label":"Výzkumník"},{"id":"EXPERT","label":"Expert"},
            {"id":"SYSADMIN","label":"SysAdmin"},{"id":"ARCHITEKT","label":"Architekt"},
            {"id":"AUDITOR","label":"Auditor"},{"id":"TESTER","label":"Tester"},
            {"id":"KODER","label":"Kodér"},{"id":"REFLEKTOR","label":"Reflektor"},
            {"id":"FINALIZER","label":"Finalizér"},
        ]
    }

@app.post("/api/prompts")
async def save_prompt(request: AgentPromptRequest):
    try:
        conn = sqlite3.connect(DB_PATH); c = conn.cursor()
        c.execute('INSERT OR REPLACE INTO agent_prompts (agent_id,custom_prompt,updated_at) VALUES (?,?,?)',
                  (request.agent_id, request.prompt, datetime.now().isoformat()))
        conn.commit(); conn.close()
        return {"status":"ok","agent_id":request.agent_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/prompts/{agent_id}")
async def delete_prompt(agent_id: str):
    try:
        conn = sqlite3.connect(DB_PATH); c = conn.cursor()
        c.execute('DELETE FROM agent_prompts WHERE agent_id=?', (agent_id,))
        conn.commit(); conn.close()
        return {"status":"ok","agent_id":agent_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# ZIP EXPORT — generuje strukturovaný projekt ke stažení
# =============================================================================

class ZipExportRequest(BaseModel):
    html: str = ""
    css: str = ""
    js: str = ""
    project_name: str = "projekt"
    extra_files: Optional[dict] = {}  # {"filename": "content"}

def _extract_sections(html_code: str) -> dict:
    """
    Z jednoho HTML souboru extrahuje CSS a JS do oddělených souborů.
    Vrátí {html, css, js}.
    """
    css_match = re.search(r'<style[^>]*>(.*?)</style>', html_code, re.DOTALL | re.IGNORECASE)
    js_match  = re.search(r'<script[^>]*>(.*?)</script>', html_code, re.DOTALL | re.IGNORECASE)

    css = css_match.group(1).strip() if css_match else ""
    js  = js_match.group(1).strip() if js_match else ""

    # Nahraď inline <style> odkazem na soubor
    clean_html = html_code
    if css:
        clean_html = re.sub(r'<style[^>]*>.*?</style>', '<link rel="stylesheet" href="style.css">', clean_html, flags=re.DOTALL|re.IGNORECASE)
    if js:
        clean_html = re.sub(r'<script[^>]*>.*?</script>', '<script src="script.js"></script>', clean_html, flags=re.DOTALL|re.IGNORECASE)

    return {"html": clean_html, "css": css, "js": js}

@app.post("/api/export-zip")
async def export_zip(request: ZipExportRequest):
    """
    Vytvoří ZIP archiv s kompletní strukturou projektu:
    projekt/
      index.html
      style.css        (pokud existuje CSS)
      script.js        (pokud existuje JS)
      assets/          (prázdná složka pro obrázky)
      README.md
    """
    name = re.sub(r'[^\w\-]', '_', request.project_name.lower()) or "projekt"

    # Extrahuj sekce z HTML pokud nebyly dodány zvlášť
    html_code = request.html
    css_code  = request.css
    js_code   = request.js

    if html_code and not css_code and not js_code:
        extracted = _extract_sections(html_code)
        html_code = extracted["html"]
        css_code  = extracted["css"]
        js_code   = extracted["js"]

    readme = f"""# {request.project_name}

Projekt generovaný Engineering AI System v9.2

## Spuštění
1. Otevři `index.html` v prohlížeči
   — nebo —
2. Spusť lokální server:
   ```bash
   python3 -m http.server 8080
   ```
   Pak otevři http://localhost:8080

## Struktura
```
{name}/
  index.html    — hlavní stránka
  style.css     — styly
  script.js     — JavaScript logika
  assets/       — obrázky a média
```

## Úpravy
- Barvy: hledej třídy `bg-*`, `text-*` (Tailwind) nebo proměnné v style.css
- Produkty: hledej sekci s komentářem `<!-- PRODUKTY -->`
- Kontakt: aktualizuj formulář v sekci `<!-- KONTAKT -->`

_Generováno: {datetime.now().strftime("%d.%m.%Y %H:%M")}_
"""

    # Sestav ZIP v paměti
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"{name}/index.html",  html_code or "<!-- prázdný soubor -->")
        if css_code:
            zf.writestr(f"{name}/style.css", css_code)
        if js_code:
            zf.writestr(f"{name}/script.js", js_code)
        zf.writestr(f"{name}/README.md", readme)
        # Prázdná složka assets
        zf.writestr(f"{name}/assets/.gitkeep", "")
        # Extra soubory (volitelné)
        for fname, fcontent in (request.extra_files or {}).items():
            zf.writestr(f"{name}/{fname}", fcontent)

    zip_b64 = base64.b64encode(buf.getvalue()).decode()
    return {
        "status": "ok",
        "filename": f"{name}.zip",
        "data": zip_b64,
        "size_kb": round(len(buf.getvalue()) / 1024, 1),
        "files": [f for f in [
            "index.html",
            "style.css" if css_code else None,
            "script.js" if js_code else None,
            "README.md", "assets/"
        ] if f]
    }

# =============================================================================
# GIT API ENDPOINTY
# =============================================================================

@app.get("/api/git/status")
async def git_status_endpoint():
    """Vrátí kompletní Git status pro UI drawer."""
    try:
        branch, _    = _git_run(["branch", "--show-current"])
        status, _    = _git_run(["status", "--short"])
        log, _       = _git_run(["log", "--oneline", "--decorate", "-8"])
        remote, _    = _git_run(["remote", "-v"])
        ahead_behind, _ = _git_run(["rev-list", "--left-right", "--count", "HEAD...@{upstream}"])

        # Parsuj changed files
        changed = []
        for line in status.strip().splitlines():
            if line.strip():
                s = line[:2].strip()
                f = line[3:].strip()
                status_map = {
                    "M": "modified", "A": "added", "D": "deleted",
                    "R": "renamed",  "?": "untracked", "!": "ignored"
                }
                changed.append({"status": status_map.get(s, s), "file": f})

        # Parsuj ahead/behind
        ahead, behind = 0, 0
        if ahead_behind and "\t" in ahead_behind:
            parts = ahead_behind.split("\t")
            if len(parts) == 2:
                try: ahead, behind = int(parts[0]), int(parts[1])
                except: pass

        # Parsuj log
        commits = []
        for line in log.strip().splitlines():
            if line.strip():
                commits.append(line.strip())

        return {
            "branch":  branch.strip(),
            "remote":  remote.strip().split("\n")[0] if remote else "",
            "changed": changed,
            "commits": commits,
            "ahead":   ahead,
            "behind":  behind,
            "clean":   len(changed) == 0,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class GitCommitRequest(BaseModel):
    message: str = ""
    push: bool = True

@app.post("/api/git/commit")
async def git_commit_endpoint(request: GitCommitRequest):
    """Stage all → commit → (volitelně) push."""
    results = []
    try:
        # 1. Add
        out, ok = _git_run(["add", "-A"])
        results.append({"step": "add", "ok": ok, "out": out})

        # 2. Commit
        msg = request.message or f"feat: update {datetime.now().strftime('%d.%m.%Y %H:%M')}"
        _git_run(["config", "user.email", GIT_USER_EMAIL])
        _git_run(["config", "user.name", GIT_USER_NAME])
        out, ok = _git_run(["commit", "-m", msg])
        results.append({"step": "commit", "ok": ok, "out": out})

        # 3. Push (volitelně)
        if request.push and ok:
            out, ok = _git_run(["push"])
            results.append({"step": "push", "ok": ok, "out": out})

        success = all(r["ok"] for r in results if r["step"] != "add")
        return {"status": "ok" if success else "partial", "steps": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/git/pull")
async def git_pull_endpoint():
    out, ok = _git_run(["pull", "--rebase"])
    return {"status": "ok" if ok else "error", "out": out}

@app.get("/api/context")
async def get_context():
    """Debug endpoint — vrátí živý kontext projektu který dostanou agenti."""
    _project_ctx_cache["ts"] = 0  # vynutí refresh
    ctx = get_project_context()
    return {"context": ctx, "length": len(ctx)}

# =============================================================================
# SPUŠTĚNÍ KÓDU — /api/run
# =============================================================================

class RunRequest(BaseModel):
    code: str
    lang: str = "python"  # python | bash | javascript

@app.post("/api/run")
async def run_code(request: RunRequest):
    """
    Spustí kód z editoru a vrátí stdout/stderr výstup.
    Python: temp soubor → python3
    Bash: temp soubor → bash
    JavaScript: temp soubor → node
    """
    import tempfile
    lang = request.lang.lower()
    code = request.code

    try:
        # Vytvoř temp soubor
        suffix = {"python": ".py", "bash": ".sh", "javascript": ".js"}.get(lang, ".txt")
        with tempfile.NamedTemporaryFile(mode="w", suffix=suffix, delete=False) as f:
            f.write(code)
            tmpfile = f.name

        # Zvol interpreter
        if lang == "python":
            cmd = ["python3", tmpfile]
        elif lang == "bash":
            cmd = ["bash", tmpfile]
        elif lang == "javascript":
            cmd = ["node", tmpfile]
        else:
            return {"status": "error", "output": f"Jazyk '{lang}' není podporován pro spuštění.", "duration_ms": 0}

        # Spusť s timeoutem
        t0 = time.time()
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=30,
            cwd=GIT_REPO_PATH
        )
        duration_ms = int((time.time() - t0) * 1000)

        # Sestav výstup
        stdout = result.stdout.strip()
        stderr = result.stderr.strip()
        output = stdout
        if stderr:
            output = (output + "\n\n⚠️ STDERR:\n" + stderr).strip()
        if not output:
            output = "(žádný výstup)"

        return {
            "status": "ok" if result.returncode == 0 else "error",
            "output": output,
            "returncode": result.returncode,
            "duration_ms": duration_ms,
        }

    except subprocess.TimeoutExpired:
        return {"status": "error", "output": "⏱️ Timeout — kód běžel déle než 30 sekund.", "duration_ms": 30000}
    except FileNotFoundError as e:
        return {"status": "error", "output": f"❌ Interpreter nenalezen: {e}", "duration_ms": 0}
    except Exception as e:
        return {"status": "error", "output": f"❌ Chyba: {str(e)}", "duration_ms": 0}
    finally:
        try: os.unlink(tmpfile)
        except: pass

# =============================================================================
# FEEDBACK API
# =============================================================================

class FeedbackRequest(BaseModel):
    task_id: str
    query: str
    response: str
    thumbs: int   # 1 = palec nahoru, -1 = palec dolů
    comment: str = ""

@app.post("/api/feedback")
async def post_feedback(req: FeedbackRequest):
    """Uloží feedback uživatele (👍/👎) k odpovědi."""
    try:
        conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
        cur.execute('INSERT INTO feedback (task_id,query,response,thumbs,comment,date) VALUES (?,?,?,?,?,?)',
                    (req.task_id, req.query[:500], req.response[:500],
                     req.thumbs, req.comment, datetime.now().isoformat()))
        # Taky aktualizuj task_history
        cur.execute('UPDATE task_history SET feedback=? WHERE task_id=?',
                    (req.thumbs, req.task_id))
        conn.commit(); conn.close()

        # Pokud je feedback negativní → Telegram
        if req.thumbs == -1:
            await telegram_notify(
                f"👎 *Negativní feedback*\n"
                f"_{req.query[:100]}_\n"
                f"{('💬 ' + req.comment) if req.comment else ''}"
            )
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/feedback")
async def get_feedback(limit: int = 20):
    """Vrátí posledních N feedbacků."""
    try:
        conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
        cur.execute('SELECT task_id,query,thumbs,comment,date FROM feedback ORDER BY id DESC LIMIT ?', (limit,))
        rows = cur.fetchall(); conn.close()
        return [{"task_id":r[0],"query":r[1],"thumbs":r[2],"comment":r[3],"date":r[4]} for r in rows]
    except Exception: return []

# =============================================================================
# FRONTA ÚKOLŮ API
# =============================================================================

class QueueRequest(BaseModel):
    message: str
    model_id: Optional[str] = None

@app.post("/api/queue")
async def add_to_queue(req: QueueRequest):
    """Přidá úkol do fronty ke zpracování."""
    try:
        conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
        cur.execute('INSERT INTO task_queue (message,model_id,status,created_at) VALUES (?,?,?,?)',
                    (req.message, req.model_id, 'pending', datetime.now().isoformat()))
        qid = cur.lastrowid
        conn.commit(); conn.close()
        # Spusť zpracování na pozadí
        asyncio.create_task(process_queue())
        return {"status": "ok", "queue_id": qid,
                "message": f"Úkol #{qid} přidán do fronty."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/queue")
async def get_queue():
    """Vrátí stav fronty úkolů."""
    try:
        conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
        cur.execute('''SELECT id,message,status,result,code,lang,quality_score,
                              created_at,started_at,finished_at
                       FROM task_queue ORDER BY id DESC LIMIT 30''')
        rows = cur.fetchall(); conn.close()
        return [{
            "id": r[0], "message": r[1], "status": r[2],
            "result": r[3], "code": r[4], "lang": r[5],
            "quality_score": r[6],
            "created_at": r[7], "started_at": r[8], "finished_at": r[9],
        } for r in rows]
    except Exception: return []

@app.delete("/api/queue/{queue_id}")
async def delete_queue_item(queue_id: int):
    """Smaže úkol z fronty (pouze pending)."""
    try:
        conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
        cur.execute("DELETE FROM task_queue WHERE id=? AND status='pending'", (queue_id,))
        conn.commit(); conn.close()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# NOČNÍ ANALÝZA API
# =============================================================================

@app.get("/api/night-analysis")
async def get_night_analysis(limit: int = 7):
    """Vrátí výsledky posledních N nočních analýz."""
    try:
        conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
        cur.execute('''SELECT date,total_tasks,avg_quality,failed_tasks,
                              top_issues,recommendations,prompt_suggestions
                       FROM night_analysis ORDER BY id DESC LIMIT ?''', (limit,))
        rows = cur.fetchall(); conn.close()
        return [{"date":r[0],"total_tasks":r[1],"avg_quality":r[2],"failed_tasks":r[3],
                 "top_issues":r[4],"recommendations":r[5],"prompt_suggestions":r[6]} for r in rows]
    except Exception: return []

@app.post("/api/night-analysis/run")
async def trigger_night_analysis():
    """Manuálně spustí noční analýzu (pro testování)."""
    asyncio.create_task(run_night_analysis())
    return {"status": "ok", "message": "Analýza spuštěna na pozadí."}

# =============================================================================
# TELEGRAM TEST API
# =============================================================================

@app.post("/api/telegram/test")
async def test_telegram():
    """Otestuje Telegram notifikace."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return {"status": "not_configured",
                "message": "Nastav TELEGRAM_BOT_TOKEN a TELEGRAM_CHAT_ID v .env"}
    await telegram_notify(
        "🤖 *Engineering AI System v9.2*\n"
        "✅ Telegram notifikace fungují!\n"
        f"🕐 {datetime.now().strftime('%d.%m.%Y %H:%M')}"
    )
    return {"status": "ok", "message": "Testovací zpráva odeslána."}

@app.get("/api/quality-stats")
async def get_quality_stats():
    """Agregované statistiky kvality odpovědí."""
    try:
        conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
        cur.execute('''SELECT
            COUNT(*) as total,
            AVG(quality_score) as avg_q,
            MIN(quality_score) as min_q,
            MAX(quality_score) as max_q,
            SUM(CASE WHEN quality_score >= 8 THEN 1 ELSE 0 END) as excellent,
            SUM(CASE WHEN quality_score >= 6 AND quality_score < 8 THEN 1 ELSE 0 END) as good,
            SUM(CASE WHEN quality_score < 6 THEN 1 ELSE 0 END) as poor,
            SUM(CASE WHEN feedback = 1 THEN 1 ELSE 0 END) as thumbs_up,
            SUM(CASE WHEN feedback = -1 THEN 1 ELSE 0 END) as thumbs_down
            FROM task_history WHERE quality_score IS NOT NULL''')
        r = cur.fetchone()

        # Trend posledních 7 dní
        cur.execute('''SELECT DATE(date), AVG(quality_score)
                       FROM task_history WHERE quality_score IS NOT NULL
                       GROUP BY DATE(date) ORDER BY DATE(date) DESC LIMIT 7''')
        trend = [{"date": row[0], "avg": round(row[1] or 0, 1)} for row in cur.fetchall()]
        conn.close()

        return {
            "total_rated": r[0] or 0,
            "avg_quality": round(r[1] or 0, 1),
            "min": r[2], "max": r[3],
            "excellent": r[4] or 0,
            "good": r[5] or 0,
            "poor": r[6] or 0,
            "thumbs_up": r[7] or 0,
            "thumbs_down": r[8] or 0,
            "trend": trend
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
