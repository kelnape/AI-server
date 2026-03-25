import sqlite3
import os
import uuid
import traceback
import shutil
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

# Moderní LangChain / Chroma integrace
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain_core.messages import SystemMessage, HumanMessage

# Importy z konfigurace a agentů
from app.config import DB_PATH, ACTIVE_MODEL
from app.agents.nodes import build_llm, telegram_notify
from app.agents.memory import get_vector_db

router = APIRouter(prefix="/api", tags=["Telemetry & Memory"])

# =============================================================================
# DATOVÉ MODELY
# =============================================================================

class LearnRequest(BaseModel):
    content: Optional[str] = None
    text: Optional[str] = None
    message: Optional[str] = None
    metadata: Optional[dict] = {}

class FeedbackRequest(BaseModel):
    task_id: str; query: str; response: str; thumbs: int; comment: str = ""

# =============================================================================
# INTELIGENTNÍ FILTR (Opravený a bezpečný)
# =============================================================================

async def analyze_content_type(text: str):
    """Určí typ obsahu. Pokud selže, vrací 'KNOWLEDGE' pro jistotu."""
    try:
        # Použijeme levný model pro rychlou filtraci
        llm = build_llm("gpt-4o-mini")
        sys_msg = SystemMessage(content=(
            "Jsi filtr znalostí. Analyzuj text a odpověz JEDNÍM SLOVEM: "
            "'KNOWLEDGE' (fakt, pravidlo, informace), "
            "'QUERY' (otázka, dotaz) nebo 'NOISE' (šum, pozdrav)."
        ))
        res = await llm.ainvoke([sys_msg, HumanMessage(content=text)])
        return res.content.strip().upper()
    except Exception as e:
        print(f"⚠️ Varování: Analýza obsahu selhala ({e}). Používám default.")
        return "KNOWLEDGE"

# =============================================================================
# ENDPOINTY PAMĚTI
# =============================================================================

@router.post("/learn")
async def learn_something(req: LearnRequest, raw_request: Request):
    db = get_vector_db()
    if not db:
        raise HTTPException(status_code=500, detail="Vektorová DB není aktivní.")

    # --- AGRESIVNÍ EXTRAKCE TEXTU ---
    raw_body = await raw_request.json()
    
    # Prohledáme všechny možné zdroje textu
    final_text = (
        req.content or req.text or req.message or 
        raw_body.get("content") or raw_body.get("text") or 
        raw_body.get("message") or raw_body.get("val") or 
        raw_body.get("query")
    )

    if not final_text:
        # Vypíšeme do terminálu, co přesně přišlo, abychom to viděli
        print(f"❌ CHYBA 400: Přišla prázdná data: {raw_body}")
        raise HTTPException(status_code=400, detail="Nebyl nalezen žádný text k uložení.")

    # --- FILTR ---
    content_type = await analyze_content_type(str(final_text))
    if "QUERY" in content_type:
        return {"status": "ignored", "message": "Dotazy neukládám."}

    try:
        unique_id = str(uuid.uuid4())
        db.add_texts(
            texts=[str(final_text)],
            ids=[unique_id],
            metadatas=[{"date": datetime.now().isoformat(), "type": "knowledge"}]
        )
        print(f"✅ ULOŽENO: {str(final_text)[:50]}...")
        return {"status": "ok", "id": unique_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/memory")
async def get_memory():
    db = get_vector_db()
    if not db: return []
    try:
        res = db._collection.get()
        return [{"id": res['ids'][i], "content": res['documents'][i], "metadata": res['metadatas'][i]} for i in range(len(res['ids']))]
    except Exception: return []

@router.delete("/memory/clear")
async def clear_all_memory():
    """TLAČÍTKO SMRT: Vymaže kompletně celou ChromaDB."""
    db_path = "db/chroma_db"
    try:
        if os.path.exists(db_path):
            shutil.rmtree(db_path) # Smaže celou složku
            return {"status": "ok", "message": "Veškerá paměť byla vymazána."}
        return {"status": "ok", "message": "Paměť byla již prázdná."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chyba při mazání: {str(e)}")

# =============================================================================
# TELEMETRIE
# =============================================================================

@router.get("/telemetry")
async def get_telemetry(limit: int = 10):
    """Vrátí telemetrii posledních N úkolů — tokeny a cena per agent."""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('SELECT DISTINCT task_id FROM telemetry ORDER BY rowid DESC LIMIT ?', (limit,))
        task_ids = [r[0] for r in c.fetchall()]
        if not task_ids:
            conn.close()
            return {"tasks": [], "totals": {"input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0}}
        ph = ",".join("?" * len(task_ids))
        c.execute(f'''
            SELECT task_id, agent_id, model,
                   SUM(input_tokens), SUM(output_tokens), SUM(cost_usd), SUM(duration_ms), MAX(date)
            FROM telemetry WHERE task_id IN ({ph})
            GROUP BY task_id, agent_id ORDER BY task_id DESC
        ''', task_ids)
        rows = c.fetchall()
        c.execute('SELECT SUM(input_tokens), SUM(output_tokens), SUM(cost_usd) FROM telemetry')
        totals_row = c.fetchone()
        conn.close()
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
        for t in tasks:
            t["total_cost"] = round(t["total_cost"], 6)
        return {"tasks": tasks,
                "totals": {"input_tokens": int(totals_row[0] or 0),
                           "output_tokens": int(totals_row[1] or 0),
                           "cost_usd": round(float(totals_row[2] or 0), 4)}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/telemetry")
async def clear_telemetry():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.cursor().execute('DELETE FROM telemetry')
        conn.commit(); conn.close()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/telemetry/debug")
async def telemetry_debug():
    """Debug — vrátí poslední záznamy telemetrie."""
    try:
        conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
        cur.execute('SELECT * FROM telemetry ORDER BY id DESC LIMIT 5')
        rows = cur.fetchall()
        cur.execute('SELECT COUNT(*) FROM telemetry')
        total = cur.fetchone()[0]
        conn.close()
        return {"total_records": total, "last_5": [
            {"id":r[0],"task_id":r[1],"agent":r[2],"model":r[3],
             "in":r[4],"out":r[5],"cost":r[6],"ms":r[7],"date":r[8]}
            for r in rows
        ]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/quality-stats")
async def get_quality_stats():
    try:
        conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
        cur.execute('''SELECT COUNT(*), AVG(quality_score), MIN(quality_score), MAX(quality_score),
            SUM(CASE WHEN quality_score >= 8 THEN 1 ELSE 0 END),
            SUM(CASE WHEN quality_score >= 6 AND quality_score < 8 THEN 1 ELSE 0 END),
            SUM(CASE WHEN quality_score < 6 THEN 1 ELSE 0 END),
            SUM(CASE WHEN feedback = 1 THEN 1 ELSE 0 END),
            SUM(CASE WHEN feedback = -1 THEN 1 ELSE 0 END)
            FROM task_history WHERE quality_score IS NOT NULL''')
        r = cur.fetchone()
        cur.execute('''SELECT DATE(date), AVG(quality_score)
                       FROM task_history WHERE quality_score IS NOT NULL
                       GROUP BY DATE(date) ORDER BY DATE(date) DESC LIMIT 7''')
        trend = [{"date": row[0], "avg": round(row[1] or 0, 1)} for row in cur.fetchall()]
        conn.close()
        return {"total_rated": r[0] or 0, "avg_quality": round(r[1] or 0, 1),
                "min": r[2], "max": r[3], "excellent": r[4] or 0, "good": r[5] or 0,
                "poor": r[6] or 0, "thumbs_up": r[7] or 0, "thumbs_down": r[8] or 0,
                "trend": trend}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))