import os
from dotenv import load_dotenv

# Načtení .env souboru
load_dotenv()

# =============================================================================
# ZÁKLADNÍ CESTY
# =============================================================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "system_data.db")
CHROMA_PATH = os.path.join(BASE_DIR, "chroma_db")

# Cesty k externím složkám (pokud nejsou v .env, vytvoří se fallback v backendu)
GIT_REPO_PATH = os.getenv("GIT_REPO_PATH", os.path.join(BASE_DIR, "workspace"))
NAS_PATH = os.getenv("NAS_PATH", os.path.join(BASE_DIR, "nas_storage"))

# Ujistíme se, že základní složky existují
os.makedirs(GIT_REPO_PATH, exist_ok=True)
os.makedirs(NAS_PATH, exist_ok=True)

# =============================================================================
# API KLÍČE A ZABEZPEČENÍ
# =============================================================================
API_SECRET = os.getenv("API_SECRET", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
SUDO_PASSWORD = os.getenv("SUDO_PASSWORD", "")

# =============================================================================
# GIT KONFIGURACE PRO AGENTY
# =============================================================================
GIT_TOKEN = os.getenv("GIT_TOKEN", "")
GIT_USER_NAME = os.getenv("GIT_USER_NAME", "AI System")
GIT_USER_EMAIL = os.getenv("GIT_USER_EMAIL", "ai@system.local")

# Seznam veřejných endpointů, které nevyžadují ověření přes API klíč
PUBLIC_PATHS = [
    "/api/health",
    "/api/models",
    "/api/metrics",
    "/api/nas/thumbnail",
    "/api/nas/file",
]

# =============================================================================
# TELEGRAM NOTIFIKACE
# =============================================================================
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# =============================================================================
# AI MODELY
# =============================================================================
ANTHROPIC_AVAILABLE = bool(ANTHROPIC_API_KEY)

# --- DOSTUPNÉ MODELY PRO FRONTEND ---
AVAILABLE_MODELS = [
    {"id": "claude-sonnet-4-5-20250929", "name": "Claude 4.5 Sonnet (Nejlepší)"},
    {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet"},
    {"id": "gpt-4o", "name": "GPT-4o"},
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini (Rychlý)"}
]

# Pokud tam máš někde definovaný ACTIVE_MODEL, nastav ho na ten nejlepší:
ACTIVE_MODEL = "claude-sonnet-4-5-20250929"

ACTIVE_MODEL = "claude-4-5-sonnet-20250929"