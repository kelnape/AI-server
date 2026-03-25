from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import system, chat, nas, git, telemetry
from app.security import setup_security
from app.routers import nas

app = FastAPI(title="Inženýrský Systém V9.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Bezpečnostní middleware (API klíč, rate limiting, lockout)
setup_security(app)

# --- PRAVIDLO PRO PREFIXY ---
# Pokud router (např. chat.py) už má v sobě prefix="/api", 
# připojujeme ho BEZ prefixu v include_router.

# 1. System (Metriky) - nemá prefix v sobě
app.include_router(system.router, prefix="/api")

# 2. Chat, Historie, Modely - má prefix="/api" v sobě
app.include_router(chat.router)

# 3. Telemetrie, Paměť, Fronta - má prefix="/api" v sobě
app.include_router(telemetry.router)

# 4. NAS - má prefix="/api/nas" v sobě (podle tvého souboru)
app.include_router(nas.router) 

# 5. Git - pravděpodobně nemá prefix
app.include_router(git.router, prefix="/api/git", tags=["git"])

@app.get("/")
async def root():
    return {"status": "online", "info": "Všechny systémy připraveny."}