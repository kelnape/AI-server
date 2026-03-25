import os
import time
import subprocess
import psutil
import sqlite3
import zipfile
import io
import base64
import re
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

router = APIRouter()
BOOT_TIME = psutil.boot_time()

# Importy konfigurace
from app.config import GIT_REPO_PATH, DB_PATH, API_SECRET



# POZNÁMKA: Funkci build_llm zatím importujeme z main.py, než ji přesuneme
try:
    from app.main import build_llm
except ImportError:
    pass



@router.get("/health")
async def health_check():
    """Základní health check systému."""
    return {"status": "ok", "auth_enabled": bool(API_SECRET), "version": "9.2"}

# =============================================================================
# DOSTUPNÉ MODELY PRO FRONTEND
# =============================================================================

@router.get("/models")
async def get_models():
    """Vrátí seznam dostupných modelů pro rozbalovací menu."""
    # Definiční seznam modelů (fallback, pokud by chyběly v configu)
    models_list = [
        {"id": "claude-sonnet-4-5-20250929", "name": "Claude 4.5 Sonnet (Nejlepší)"},
        {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet"},
        {"id": "gpt-4o", "name": "GPT-4o"},
        {"id": "gpt-4o-mini", "name": "GPT-4o Mini (Rychlý)"}
    ]
    
    # Pokusíme se načíst aktivní model z configu, jinak dáme Claude 4.5
    try:
        from app.config import ACTIVE_MODEL
        active = ACTIVE_MODEL
    except ImportError:
        active = "claude-sonnet-4-5-20250929"
        
    return {
        "models": models_list,
        "active_model": active
    }

@router.get("/debug/db")
async def debug_db():
    """Kompletní debug stav databáze."""
    try:
        conn = sqlite3.connect(DB_PATH); cur = conn.cursor()
        counts = {}
        for table in ["task_history", "telemetry", "feedback", "task_queue"]:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                counts[table] = cur.fetchone()[0]
            except Exception as e:
                counts[table] = f"chyba: {e}"
        
        cols_h = [r[1] for r in cur.execute("PRAGMA table_info(task_history)").fetchall()]
        cols_t = [r[1] for r in cur.execute("PRAGMA table_info(telemetry)").fetchall()]
        
        cur.execute("SELECT task_id, query, LENGTH(response), date, model FROM task_history ORDER BY id DESC LIMIT 3")
        last_h = [{"task_id": r[0], "query": (r[1] or "")[:50], "resp_len": r[2], "date": r[3]} for r in cur.fetchall()]
        
        cur.execute("SELECT task_id, agent_id, input_tokens, output_tokens, cost_usd FROM telemetry ORDER BY id DESC LIMIT 5")
        last_t = [{"task_id": r[0], "agent": r[1], "in": r[2], "out": r[3], "cost": r[4]} for r in cur.fetchall()]
        
        conn.close()
        return {
            "db_path": DB_PATH, "counts": counts,
            "task_history_cols": cols_h, "telemetry_cols": cols_t,
            "last_history": last_h, "last_telemetry": last_t
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# SPUŠTĚNÍ KÓDU
# =============================================================================

class RunRequest(BaseModel):
    code: str
    lang: str = "python"

@router.post("/run")
async def run_code(request: RunRequest):
    """Spustí kód z editoru a vrátí stdout/stderr výstup."""
    import tempfile
    lang = request.lang.lower()
    code = request.code

    try:
        suffix = {"python": ".py", "bash": ".sh", "javascript": ".js"}.get(lang, ".txt")
        with tempfile.NamedTemporaryFile(mode="w", suffix=suffix, delete=False) as f:
            f.write(code)
            tmpfile = f.name

        if lang == "python":
            cmd = ["python3", tmpfile]
        elif lang == "bash":
            cmd = ["bash", tmpfile]
        elif lang == "javascript":
            cmd = ["node", tmpfile]
        else:
            return {"status": "error", "output": f"Jazyk '{lang}' není podporován pro spuštění.", "duration_ms": 0}

        t0 = time.time()
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, cwd=GIT_REPO_PATH)
        duration_ms = int((time.time() - t0) * 1000)

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
        return {"status": "error", "output": "⏱️ Timeout - kód běžel déle než 30 sekund.", "duration_ms": 30000}
    except FileNotFoundError as e:
        return {"status": "error", "output": f"❌ Interpreter nenalezen: {e}", "duration_ms": 0}
    except Exception as e:
        return {"status": "error", "output": f"❌ Chyba: {str(e)}", "duration_ms": 0}
    finally:
        try: os.unlink(tmpfile)
        except: pass

# =============================================================================
# ZIP EXPORT
# =============================================================================

class ZipExportRequest(BaseModel):
    html: str = ""
    css: str = ""
    js: str = ""
    project_name: str = "projekt"
    extra_files: Optional[dict] = {}

def _extract_sections(html_code: str) -> dict:
    css_match = re.search(r'<style[^>]*>(.*?)</style>', html_code, re.DOTALL | re.IGNORECASE)
    js_match  = re.search(r'<script[^>]*>(.*?)</script>', html_code, re.DOTALL | re.IGNORECASE)
    css = css_match.group(1).strip() if css_match else ""
    js  = js_match.group(1).strip() if js_match else ""
    
    clean_html = html_code
    if css:
        clean_html = re.sub(r'<style[^>]*>.*?</style>', '<link rel="stylesheet" href="style.css">', clean_html, flags=re.DOTALL|re.IGNORECASE)
    if js:
        clean_html = re.sub(r'<script[^>]*>.*?</script>', '<script src="script.js"></script>', clean_html, flags=re.DOTALL|re.IGNORECASE)
    return {"html": clean_html, "css": css, "js": js}

@router.post("/export-zip")
async def export_zip(request: ZipExportRequest):
    """Vytvoří ZIP archiv s kompletní strukturou projektu."""
    name = re.sub(r'[^\w\-]', '_', request.project_name.lower()) or "projekt"
    html_code, css_code, js_code = request.html, request.css, request.js

    if html_code and not css_code and not js_code:
        extracted = _extract_sections(html_code)
        html_code, css_code, js_code = extracted["html"], extracted["css"], extracted["js"]

    readme = f"""# {request.project_name}\n\nProjekt generovaný Engineering AI System v9.2\n\n## Spuštění\n1. Otevři `index.html` v prohlížeči\n"""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"{name}/index.html", html_code or "")
        if css_code: zf.writestr(f"{name}/style.css", css_code)
        if js_code: zf.writestr(f"{name}/script.js", js_code)
        zf.writestr(f"{name}/README.md", readme)
        zf.writestr(f"{name}/assets/.gitkeep", "")
        for fname, fcontent in (request.extra_files or {}).items():
            zf.writestr(f"{name}/{fname}", fcontent)

    zip_b64 = base64.b64encode(buf.getvalue()).decode()
    return {
        "status": "ok", "filename": f"{name}.zip", "data": zip_b64,
        "size_kb": round(len(buf.getvalue()) / 1024, 1),
        "files": [f for f in ["index.html", "style.css" if css_code else None, "script.js" if js_code else None, "README.md", "assets/"] if f]
    }

# =============================================================================
# SPRÁVCE SOUBORŮ A TERMINÁL
# =============================================================================

@router.get("/files/list")
def list_files(path: str = ""):
    base = os.path.join(GIT_REPO_PATH, path)
    if not os.path.exists(base):
        raise HTTPException(404, "Path neexistuje")
    items = []
    for name in os.listdir(base):
        full = os.path.join(base, name)
        items.append({
            "name": name, "path": os.path.join(path, name),
            "type": "dir" if os.path.isdir(full) else "file",
            "size": os.path.getsize(full) if os.path.isfile(full) else None
        })
    return {"path": path, "items": items}

@router.get("/files/read")
def read_file_api(path: str):
    full = os.path.join(GIT_REPO_PATH, path)
    if not os.path.exists(full):
        raise HTTPException(404, "Soubor neexistuje")
    with open(full, "r", encoding="utf-8", errors="ignore") as f:
        return {"content": f.read()}

@router.post("/files/write")
async def write_file_api(request: Request):
    data = await request.json()
    full = os.path.join(GIT_REPO_PATH, data["path"])
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(data["content"])
    return {"status": "ok"}

@router.post("/terminal")
async def terminal(request: Request):
    data = await request.json()
    result = subprocess.run(data.get("cmd"), shell=True, capture_output=True, text=True)
    return {"output": result.stdout + result.stderr}

# =============================================================================
# SYSTÉMOVÉ SLUŽBY A AI DEBUG
# =============================================================================

@router.get("/logs")
def get_logs():
    try:
        logs = subprocess.run(["journalctl", "-u", "backend", "-n", "100", "--no-pager"], capture_output=True, text=True).stdout
        return {"logs": logs}
    except Exception as e:
        return {"logs": str(e)}

@router.post("/service/restart")
def restart_service():
    subprocess.run(["sudo", "systemctl", "restart", "backend"])
    return {"status": "restarting"}

@router.get("/ai/debug")
async def ai_debug():
    logs = subprocess.run(["journalctl", "-u", "backend", "-n", "50", "--no-pager"], capture_output=True, text=True).stdout
    try:
        llm = build_llm()
        response = llm.invoke([HumanMessage(content=f"Analyzuj logy a navrhni fix:\n{logs}")])
        return {"analysis": response.content}
    except Exception as e:
        return {"analysis": f"Chyba LLM: {str(e)}"}

@router.post("/ai/autofix")
async def ai_autofix(request: Request):
    data = await request.json()
    full = os.path.join(GIT_REPO_PATH, data.get("path"))
    if not os.path.exists(full):
        raise HTTPException(404, "File not found")
    
    with open(full, "r", encoding="utf-8", errors="ignore") as f:
        code = f.read()
        
    logs = subprocess.run(["journalctl", "-u", "backend", "-n", "50", "--no-pager"], capture_output=True, text=True).stdout
    try:
        llm = build_llm()
        response = llm.invoke([HumanMessage(content=f"Oprav tento kód na základě chyb:\n\nLOGS:\n{logs}\n\nCODE:\n{code}\n\nVrať pouze opravený kód.")])
        fixed_code = response.content
        with open(full, "w", encoding="utf-8") as f:
            f.write(fixed_code)
        return {"status": "fixed", "code": fixed_code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# =============================================================================
# SPRÁVA PROMPTŮ AGENTŮ (Pro PromptEditor.jsx)
# =============================================================================

class PromptRequest(BaseModel):
    agent_id: str
    prompt: str

@router.get("/prompts")
async def get_prompts():
    """Vrátí všechny uložené prompty agentů a základní identitu."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        
        # Vytvoříme tabulku pokud neexistuje
        cur.execute("""
            CREATE TABLE IF NOT EXISTS agent_prompts (
                agent_id TEXT PRIMARY KEY,
                prompt TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Získáme všechny prompty
        cur.execute("SELECT agent_id, prompt FROM agent_prompts")
        rows = cur.fetchall()
        agent_prompts = {row[0]: row[1] for row in rows}
        
        conn.close()
        
        # Importujeme BASE_TEAM_IDENTITY z nodes.py
        try:
            from app.agents.nodes import BASE_TEAM_IDENTITY
            base_identity = BASE_TEAM_IDENTITY
        except ImportError:
            base_identity = "Systémová identita multi-agentního týmu..."
        
        return {
            "agent_prompts": agent_prompts,
            "base_identity": base_identity
        }
    except Exception as e:
        return {
            "agent_prompts": {},
            "base_identity": "Chyba při načítání identity",
            "error": str(e)
        }

@router.post("/prompts")
async def save_prompt(request: PromptRequest):
    """Uloží nebo aktualizuje prompt pro daného agenta."""
    try:
        if not request.agent_id or not request.prompt:
            raise HTTPException(status_code=400, detail="agent_id a prompt jsou povinné")
        
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        
        # Vytvoříme tabulku pokud neexistuje
        cur.execute("""
            CREATE TABLE IF NOT EXISTS agent_prompts (
                agent_id TEXT PRIMARY KEY,
                prompt TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Uložíme nebo aktualizujeme prompt
        cur.execute("""
            INSERT OR REPLACE INTO agent_prompts (agent_id, prompt, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        """, (request.agent_id, request.prompt))
        
        conn.commit()
        conn.close()
        
        return {"status": "ok", "agent_id": request.agent_id, "saved": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chyba při ukládání promptu: {str(e)}")

@router.delete("/prompts/{agent_id}")
async def delete_prompt(agent_id: str):
    """Smaže prompt pro daného agenta."""
    try:
        if not agent_id:
            raise HTTPException(status_code=400, detail="agent_id je povinné")
        
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        
        # Vytvoříme tabulku pokud neexistuje
        cur.execute("""
            CREATE TABLE IF NOT EXISTS agent_prompts (
                agent_id TEXT PRIMARY KEY,
                prompt TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Smažeme prompt
        cur.execute("DELETE FROM agent_prompts WHERE agent_id = ?", (agent_id,))
        conn.commit()
        conn.close()
        
        return {"status": "ok", "agent_id": agent_id, "deleted": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chyba při mazání promptu: {str(e)}")

# =============================================================================
# METRIKY SERVERU
# =============================================================================

@router.get("/metrics")
def get_metrics():
    """Vrátí aktuální vytížení serveru pro horní lištu ve frontendu."""
    try:
        # 1. CPU
        cpu = psutil.cpu_percent(interval=0.1)
        
        # 2. RAM (zformátováno např. jako "4.2/8.0 GB")
        mem = psutil.virtual_memory()
        ram_used = round((mem.total - mem.available) / (1024**3), 1)
        ram_total = round(mem.total / (1024**3), 1)
        ram_str = f"{ram_used}/{ram_total} GB"
        
        # 3. Teplota (pro Linux / Raspberry Pi)
        temp = 0.0
        temp_path = "/sys/class/thermal/thermal_zone0/temp"
        if os.path.exists(temp_path):
            with open(temp_path) as f:
                temp = round(int(f.read().strip()) / 1000, 1)
        
        # 4. Docker (spočítá běžící kontejnery)
        docker_count = 0
        try:
            docker_out = subprocess.check_output(["docker", "ps", "-q"]).decode("utf-8")
            docker_count = len([line for line in docker_out.strip().split('\n') if line])
        except Exception:
            docker_count = 0
            
        # 5. Uptime serveru
        uptime_sec = time.time() - BOOT_TIME
        hours, remainder = divmod(int(uptime_sec), 3600)
        minutes, _ = divmod(remainder, 60)
        days, hours = divmod(hours, 24)
        
        if days > 0:
            uptime_str = f"{days}d {hours}h"
        else:
            uptime_str = f"{hours}h {minutes}m"

        # Přesně tyhle názvy klíčů tvůj React očekává!
        return {
            "cpu": cpu,
            "ram": ram_str,
            "temp": temp,
            "docker": docker_count,
            "uptime": uptime_str
        }
    except Exception as e:
        return {"cpu": 0, "ram": "Error", "temp": 0, "docker": 0, "uptime": "Error"}