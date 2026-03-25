# app/security.py
import time
import collections
from fastapi import Request
from fastapi.responses import JSONResponse

# Import konfigurace
from app.config import API_SECRET, PUBLIC_PATHS

# --- RATE LIMITING ---
# Max požadavků za okno
RATE_LIMIT_REQUESTS = 1000  
RATE_LIMIT_WINDOW   = 60  # v sekundách

_rate_buckets: dict = collections.defaultdict(list)

def _check_rate_limit(ip: str) -> bool:
    """Vrátí True pokud je požadavek v limitu, False pokud byl překročen."""
    now = time.time()
    bucket = _rate_buckets[ip]
    # Smaže záznamy starší než RATE_LIMIT_WINDOW
    _rate_buckets[ip] = [t for t in bucket if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_buckets[ip]) >= RATE_LIMIT_REQUESTS:
        return False
    _rate_buckets[ip].append(now)
    return True

# --- LOCKOUT (Blokování po neúspěšných pokusech) ---
AUTH_LOCKOUT_ATTEMPTS = 500   
AUTH_LOCKOUT_WINDOW   = 100  # 5 minut

_auth_failures: dict = collections.defaultdict(list)

def _is_locked_out(ip: str) -> bool:
    now = time.time()
    _auth_failures[ip] = [t for t in _auth_failures[ip] if now - t < AUTH_LOCKOUT_WINDOW]
    return len(_auth_failures[ip]) >= AUTH_LOCKOUT_ATTEMPTS

def _record_auth_failure(ip: str):
    _auth_failures[ip].append(time.time())

# --- FASTAPI MIDDLEWARE ---
async def security_middleware(request: Request, call_next):
    """
    Middleware vrstva, která zachytí každý HTTP požadavek a ověří:
    1. Zdali je cesta veřejná.
    2. Zdali uživatel nepřekročil rate limit.
    3. Zdali uživatel nemá dočasný ban za špatná hesla.
    4. Zdali sedí API klíč (pokud je systém uzamčen).
    """
    ip = request.client.host if request.client else "unknown"
    path = request.url.path

    # Veřejné cesty - bez autentizace (např. docs nebo health check)
    if path in PUBLIC_PATHS:
        return await call_next(request)

    # 1. Rate limiting kontrola
    if not _check_rate_limit(ip):
        return JSONResponse(
            status_code=429,
            content={"detail": "Too Many Requests - zpomal."}
        )

    # Pokud není nastaven API_SECRET v .env, autentizace je vypnutá (vývojový režim)
    if not API_SECRET:
        return await call_next(request)

    # 2. Kontrola lockoutu (prevence brute-force)
    if _is_locked_out(ip):
        return JSONResponse(
            status_code=403,
            content={"detail": "IP dočasně zablokována - příliš mnoho neúspěšných pokusů."}
        )

    # 3. Ověření API klíče - bere se z headeru 'X-API-Key' nebo z URL '?key='
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

    # Pokud je vše v pořádku, pustíme požadavek dál do aplikace
    return await call_next(request)


def setup_security(app):
    """Registruje security_middleware na FastAPI aplikaci."""
    app.middleware("http")(security_middleware)