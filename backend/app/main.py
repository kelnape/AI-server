from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import system, chat, nas, git, telemetry
from app.security import setup_security

import sqlite3
from app.config import DB_PATH 

app = FastAPI(title="Inženýrský Systém V9.2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Bezpečnostní middleware
setup_security(app)

# =========================================================
# 🚀 NAŠE NOVÁ FUNKCE MUSÍ BÝT ZDE (NAD VŠEMI ROUTERY)
# =========================================================
@app.get("/api/agent-stats")
async def get_agent_telemetry():
    """Vrátí statistiky agentů pro nový Cyberpunk Dashboard"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='telemetry'")
        if not cur.fetchone():
            conn.close()
            return {"status": "ok", "data": []}

        cur.execute("""
            SELECT agent_id, 
                   COUNT(id) as requests, 
                   SUM(input_tokens + output_tokens) as tokens, 
                   SUM(cost_usd) as cost 
            FROM telemetry 
            GROUP BY agent_id
        """)
        rows = cur.fetchall()
        conn.close()
        
        stats = []
        for r in rows:
            stats.append({
                "name": r[0].upper(),
                "requests": r[1],
                "tokens": r[2] or 0,
                "cost": round(r[3] or 0.0, 5)
            })
            
        return {"status": "ok", "data": stats}
        
    except Exception as e:
        return {"status": "error", "message": str(e), "data": []}

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