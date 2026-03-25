import json
import asyncio
import re
import sqlite3
import time
import traceback
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

# --- IMPORTY ---
from app.config import DB_PATH, ACTIVE_MODEL as CONFIG_ACTIVE_MODEL, AVAILABLE_MODELS
from app.services.file_parser import FileData, process_files, build_human_message
from app.agents.nodes import (
    build_llm, load_agent_prompts, telegram_notify, 
    SYSTEM_ALERTS, BASE_TEAM_IDENTITY
)
from app.agents.graph import agent_app

router = APIRouter(prefix="/api", tags=["Chat & AI"])

# Globální proměnné
CB = "`" * 3
SESSION_HISTORY = []
MAX_HISTORY = 10
ACTIVE_MODEL = CONFIG_ACTIVE_MODEL  # Globální kopie pro změnu za běhu

def _save_session_history():
    try:
        data = json.dumps([
            {"role": "human" if isinstance(m, HumanMessage) else "ai",
             "content": m.content if isinstance(m.content, str) else ""}
            for m in SESSION_HISTORY
        ])
        conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
        cur.execute("CREATE TABLE IF NOT EXISTS session_state (key TEXT PRIMARY KEY, value TEXT)")
        cur.execute("INSERT OR REPLACE INTO session_state (key, value) VALUES ('history', ?)", (data,))
        conn.commit(); conn.close()
    except Exception: pass

class ChatRequest(BaseModel):
    message: str
    files: Optional[list[FileData]] = []
    model_id: Optional[str] = None
    project_specs: Optional[dict] = {}

# --- HLAVNÍ CHAT ENDPOINT ---
@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    async def stream():
        global SESSION_HISTORY
        try:
            model_id = request.model_id or ACTIVE_MODEL
            processed = process_files(request.files or [])
            effective_model = model_id
            
            human_msg = build_human_message(request.message, processed)
            task_id = datetime.now().strftime("%Y%m%d_%H%M%S_") + str(abs(hash(request.message)) % 10000)
            
            initial_state = {
                "messages": SESSION_HISTORY + [human_msg],
                "iterations": 0,
                "status": "",
                "route": "",
                "error_log": "",
                "plan": [],
                "current_step": -1,
                "model_id": effective_model,
                "task_id": task_id,
                "project_specs": request.project_specs,
                "is_web_project": True,
                "agent_memory": {},
            }
            
            history_contents = []
            last_node = "MANAŽER"

            async for output in agent_app.astream(initial_state): # type: ignore
                for node, update in output.items():
                    # PŘEVOD NÁZVU UZLU NA VELKÁ PÍSMENA (aby to sedělo na tvé UI)
                    node_id = node.upper()
                    if node_id == "MANAZER": node_id = "MANAŽER" # korekce diakritiky
                    
                    # 1. SIGNÁL PRO ROZSVÍCENÍ AGENTA NAHOŘE (Type: progress)
                    yield json.dumps({"type": "progress", "node": node_id}) + "\n"
                    
                    if "messages" in update and update["messages"]:
                        last_m = update["messages"][-1]
                        if last_m and last_m.content:
                            content = str(last_m.content)
                            history_contents.append(content)
                            last_node = node_id
                            
                            # 2. SIGNÁL PRO ZOBRAZENÍ ZPRÁVY VLEVO (Type: agent_output)
                            # Posíláme 'node', aby se u bubliny zobrazilo správné jméno
                            yield json.dumps({
                                "type": "agent_output", 
                                "node": node_id, 
                                "content": content[:3000]
                            }) + "\n"

            # --- EXTRAKCE KÓDU PRO EDITOR ---
            final_raw = history_contents[-1] if history_contents else "Hotovo."
            code, lang = "", "python"
            for msg_content in reversed(history_contents):
                for l in ["python", "html", "javascript", "css", "bash", "json"]:
                    found = re.search(rf"{CB}{l}\n(.*?)\n{CB}", str(msg_content), re.DOTALL)
                    if found:
                        code = found.group(1).strip()
                        lang = l
                        break
                if code: break

            clean_text = re.sub(rf"{CB}.*?{CB}", "", str(final_raw), flags=re.DOTALL).strip()
            
            # 3. FINÁLNÍ ZPRÁVA (Včetně jména posledního agenta)
            yield json.dumps({
                "type": "final", 
                "response": clean_text, 
                "code": code,
                "lang": lang,
                "node": last_node, # Aby se i u finální odpovědi svítil správný agent
                "date": datetime.now().strftime("%H:%M:%S")
            }) + "\n"
            
            SESSION_HISTORY.append(human_msg)
            SESSION_HISTORY.append(AIMessage(content=str(clean_text)))
            SESSION_HISTORY = SESSION_HISTORY[-MAX_HISTORY:]
            _save_session_history()

        except Exception as e:
            traceback.print_exc()
            yield json.dumps({"type": "error", "message": str(e)}) + "\n"

    return StreamingResponse(stream(), media_type="text/event-stream")

# --- ZBYTEK API ---
@router.get("/history")
async def get_history():
    try:
        conn = sqlite3.connect(DB_PATH); c = conn.cursor()
        c.execute('SELECT query, response, code, date, model FROM task_history ORDER BY id DESC LIMIT 20')
        rows = c.fetchall(); conn.close()
        return [{"query":r[0],"response":r[1],"code":r[2],"date":r[3],"model":r[4],"hasCode":bool(r[2])} for r in rows]
    except Exception: return []


@router.get("/models")
async def get_models():
    """Vrátí seznam dostupných AI modelů pro dropdown v UI."""
    try:
        models_list = [
            {
                "id": mid, 
                "label": info.get("label", mid), 
                "provider": info.get("provider", "openai"), 
                "available": True
            }
            for mid, info in AVAILABLE_MODELS.items()
        ]
        
        if not models_list:
            models_list = [
                {"id": "gpt-4o-mini", "label": "GPT-4o Mini", "provider": "openai", "available": True},
                {"id": "gpt-4o", "label": "GPT-4o", "provider": "openai", "available": True}
            ]

        return {
            "active": ACTIVE_MODEL or "gpt-4o-mini",
            "available": models_list
        }
    except Exception as e:
        print(f"CHYBA v get_models: {e}")
        return {
            "active": "gpt-4o-mini",
            "available": [
                {"id": "gpt-4o-mini", "label": "GPT-4o Mini (Nouzový)", "provider": "openai", "available": True}
            ]
        }


class ModelSwitch(BaseModel):
    model_id: str


@router.post("/model")
async def switch_model(data: ModelSwitch):
    """Přepne aktivní model."""
    global ACTIVE_MODEL
    try:
        if data.model_id not in AVAILABLE_MODELS:
            raise HTTPException(status_code=400, detail=f"Neznámý model: {data.model_id}")
        
        ACTIVE_MODEL = data.model_id
        
        # Ulož do DB pro persistenci
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)")
        cur.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('active_model', ?)", (data.model_id,))
        conn.commit()
        conn.close()
        
        return {"status": "ok", "active_model": data.model_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"CHYBA v switch_model: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts")
async def get_alerts(): return {"alerts": []}


@router.post("/session/clear")
async def clear_session():
    global SESSION_HISTORY
    SESSION_HISTORY = []
    _save_session_history()
    return {"status": "ok"}

    
# --- PROMPTS ENDPOINTS ---
class PromptUpdate(BaseModel):
    agent_id: str
    prompt: str


@router.get("/prompts")
async def get_prompts():
    """Vrátí základní identitu a vlastní prompty agentů."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("CREATE TABLE IF NOT EXISTS agent_prompts (agent_id TEXT PRIMARY KEY, custom_prompt TEXT, updated_at TEXT)")
        cur.execute("SELECT agent_id, custom_prompt FROM agent_prompts")
        rows = cur.fetchall()
        conn.close()
        
        agent_prompts = {row[0]: row[1] for row in rows if row[1]}
        
        return {
            "base_identity": BASE_TEAM_IDENTITY,
            "agent_prompts": agent_prompts
        }
    except Exception as e:
        print(f"CHYBA v get_prompts: {e}")
        traceback.print_exc()
        return {"base_identity": "Chyba při načítání identity", "agent_prompts": {}, "error": str(e)}


@router.post("/prompts")
async def save_prompt(data: PromptUpdate):
    """Uloží vlastní prompt pro agenta."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("CREATE TABLE IF NOT EXISTS agent_prompts (agent_id TEXT PRIMARY KEY, custom_prompt TEXT, updated_at TEXT)")
        cur.execute(
            "INSERT OR REPLACE INTO agent_prompts (agent_id, custom_prompt, updated_at) VALUES (?, ?, ?)",
            (data.agent_id, data.prompt, datetime.now().isoformat())
        )
        conn.commit()
        conn.close()
        return {"status": "ok"}
    except Exception as e:
        print(f"CHYBA v save_prompt: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/prompts/{agent_id}")
async def delete_prompt(agent_id: str):
    """Smaže vlastní prompt agenta."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("DELETE FROM agent_prompts WHERE agent_id = ?", (agent_id,))
        conn.commit()
        conn.close()
        return {"status": "ok"}
    except Exception as e:
        print(f"CHYBA v delete_prompt: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/analytics")
async def get_analytics():
    """Vrátí statistiky pro dashboard."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        
        # Celkovy pocet uloh
        cur.execute("SELECT COUNT(*) FROM task_history")
        total_tasks = cur.fetchone()[0] or 0
        
        # Ulohy za poslednich 7 dni
        cur.execute("""
            SELECT date, COUNT(*) as count 
            FROM task_history 
            WHERE date >= date('now', '-7 days')
            GROUP BY date 
            ORDER BY date DESC
        """)
        daily_tasks = [{"date": row[0], "count": row[1]} for row in cur.fetchall()]
        
        # Ulohy s kodem vs bez
        cur.execute("SELECT COUNT(*) FROM task_history WHERE code IS NOT NULL AND code != ''")
        tasks_with_code = cur.fetchone()[0] or 0
        
        # Nejpouzivanejsi modely
        cur.execute("""
            SELECT model, COUNT(*) as count 
            FROM task_history 
            WHERE model IS NOT NULL
            GROUP BY model 
            ORDER BY count DESC 
            LIMIT 5
        """)
        top_models = [{"model": row[0], "count": row[1]} for row in cur.fetchall()]
        
        conn.close()
        
        return {
            "total_tasks": total_tasks,
            "tasks_with_code": tasks_with_code,
            "tasks_without_code": total_tasks - tasks_with_code,
            "daily_tasks": daily_tasks,
            "top_models": top_models,
            "success_rate": 95,  # Placeholder - muzes dopocitat z feedbacku
        }
    except Exception as e:
        print(f"CHYBA v get_analytics: {e}")
        return {
            "total_tasks": 0,
            "tasks_with_code": 0,
            "tasks_without_code": 0,
            "daily_tasks": [],
            "top_models": [],
            "success_rate": 0,
        }
        
    
@router.get("/settings")
async def get_settings():
    """Vrátí aktuální nastavení (bez citlivých hodnot)."""
    from app.config import OPENAI_API_KEY, ANTHROPIC_API_KEY
    return {
        "openai_configured": bool(OPENAI_API_KEY and len(OPENAI_API_KEY) > 10),
        "anthropic_configured": bool(ANTHROPIC_API_KEY and len(ANTHROPIC_API_KEY) > 10),
        "openai_preview": f"sk-...{OPENAI_API_KEY[-4:]}" if OPENAI_API_KEY and len(OPENAI_API_KEY) > 10 else None,
        "anthropic_preview": f"sk-...{ANTHROPIC_API_KEY[-4:]}" if ANTHROPIC_API_KEY and len(ANTHROPIC_API_KEY) > 10 else None,
    }

@router.post("/settings/api-key")
async def update_api_key(data: dict):
    """Aktualizuje API klíč v .env souboru."""
    import os
    provider = data.get("provider")  # "openai" nebo "anthropic"
    key = data.get("key", "").strip()
    
    if provider not in ["openai", "anthropic"]:
        return {"success": False, "error": "Neplatný provider"}
    
    env_var = "OPENAI_API_KEY" if provider == "openai" else "ANTHROPIC_API_KEY"
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    
    try:
        # Načti existující .env
        lines = []
        found = False
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                for line in f:
                    if line.startswith(f"{env_var}="):
                        lines.append(f"{env_var}={key}\n")
                        found = True
                    else:
                        lines.append(line)
        
        # Pokud klíč nebyl nalezen, přidej ho
        if not found:
            lines.append(f"{env_var}={key}\n")
        
        # Zapiš zpět
        with open(env_path, "w") as f:
            f.writelines(lines)
        
        # Aktualizuj v paměti
        os.environ[env_var] = key
        
        return {"success": True, "message": f"{provider.upper()} API klíč aktualizován. Restartuj backend pro plnou aplikaci."}
    except Exception as e:
        return {"success": False, "error": str(e)}
    
# =============================================================================
# CODE-SERVER ENDPOINTS - Pridej do chat.py
# =============================================================================

import subprocess
import os

@router.get("/code-server/status")
async def code_server_status():
    """Vrati stav code-serveru a cloudflared tunelu."""
    try:
        # Kontrola code-server
        code_server_running = False
        try:
            result = subprocess.run(
                ["systemctl", "is-active", "code-server"],
                capture_output=True, text=True, timeout=5
            )
            code_server_running = result.stdout.strip() == "active"
        except:
            # Zkus pgrep
            result = subprocess.run(
                ["pgrep", "-f", "code-server"],
                capture_output=True, timeout=5
            )
            code_server_running = result.returncode == 0
        
        # Kontrola cloudflared
        tunnel_running = False
        try:
            result = subprocess.run(
                ["systemctl", "is-active", "cloudflared-code"],
                capture_output=True, text=True, timeout=5
            )
            tunnel_running = result.stdout.strip() == "active"
        except:
            result = subprocess.run(
                ["pgrep", "-f", "cloudflared.*config-code"],
                capture_output=True, timeout=5
            )
            tunnel_running = result.returncode == 0
        
        # Nacti URL z konfigurace
        url = None
        config_path = os.path.expanduser("~/.cloudflared/config-code.yml")
        if os.path.exists(config_path):
            with open(config_path, "r") as f:
                for line in f:
                    if "hostname:" in line:
                        url = "https://" + line.split("hostname:")[1].strip()
                        break
        
        # Nacti heslo
        password = None
        password_path = os.path.expanduser("~/.config/code-server/.password")
        if os.path.exists(password_path):
            with open(password_path, "r") as f:
                password = f.read().strip()
        
        return {
            "code_server_running": code_server_running,
            "tunnel_running": tunnel_running,
            "url": url,
            "password": password,
            "local_url": "http://localhost:8443",
        }
    except Exception as e:
        return {
            "code_server_running": False,
            "tunnel_running": False,
            "url": None,
            "password": None,
            "error": str(e)
        }


@router.post("/code-server/control")
async def code_server_control(data: dict):
    """Ovlada code-server a tunel (start/stop/restart)."""
    action = data.get("action", "status")
    
    try:
        if action == "start":
            # Spust code-server
            subprocess.run(
                ["sudo", "systemctl", "start", "code-server"],
                capture_output=True, timeout=10
            )
            # Spust tunel
            subprocess.run(
                ["sudo", "systemctl", "start", "cloudflared-code"],
                capture_output=True, timeout=10
            )
            return {"success": True, "message": "Code-server a tunel spusteny"}
        
        elif action == "stop":
            subprocess.run(
                ["sudo", "systemctl", "stop", "cloudflared-code"],
                capture_output=True, timeout=10
            )
            subprocess.run(
                ["sudo", "systemctl", "stop", "code-server"],
                capture_output=True, timeout=10
            )
            return {"success": True, "message": "Code-server a tunel zastaveny"}
        
        elif action == "restart":
            subprocess.run(
                ["sudo", "systemctl", "restart", "code-server"],
                capture_output=True, timeout=10
            )
            subprocess.run(
                ["sudo", "systemctl", "restart", "cloudflared-code"],
                capture_output=True, timeout=10
            )
            return {"success": True, "message": "Code-server a tunel restartovany"}
        
        else:
            return {"success": False, "error": f"Neznama akce: {action}"}
    
    except Exception as e:
        return {"success": False, "error": str(e)}