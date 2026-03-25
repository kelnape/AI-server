# app/database.py
import sqlite3
import json
from langchain_core.messages import HumanMessage, AIMessage

# Import konfigurace
from app.config import DB_PATH

def init_db():
    """Inicializuje databázi a provede základní migrace chybějících sloupců."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # 1. Historie úkolů
    c.execute('''CREATE TABLE IF NOT EXISTS task_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT,
        query TEXT, response TEXT, code TEXT, date TEXT, model TEXT,
        quality_score REAL DEFAULT NULL,
        quality_reason TEXT DEFAULT NULL,
        feedback INTEGER DEFAULT NULL
    )''')
    
    # Migrace task_history
    existing_cols = [row[1] for row in c.execute("PRAGMA table_info(task_history)").fetchall()]
    for col, definition in [
        ("task_id",       "TEXT"),
        ("model",         "TEXT"),
        ("quality_score", "REAL DEFAULT NULL"),
        ("quality_reason","TEXT DEFAULT NULL"),
        ("feedback",      "INTEGER DEFAULT NULL"),
    ]:
        if col not in existing_cols:
            try: c.execute(f"ALTER TABLE task_history ADD COLUMN {col} {definition}")
            except Exception as e: print(f"[MIGRATION] {col}: {e}")

    # 2. Prompty agentů
    c.execute('''CREATE TABLE IF NOT EXISTS agent_prompts (
        agent_id TEXT PRIMARY KEY,
        custom_prompt TEXT,
        updated_at TEXT
    )''')
    
    # 3. Telemetrie
    c.execute('''CREATE TABLE IF NOT EXISTS telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT, agent_id TEXT, model TEXT,
        input_tokens INTEGER, output_tokens INTEGER,
        cost_usd REAL, duration_ms INTEGER, date TEXT
    )''')
    
    # Migrace telemetry
    tel_cols = [row[1] for row in c.execute("PRAGMA table_info(telemetry)").fetchall()]
    for col, definition in [
        ("task_id",       "TEXT"),
        ("agent_id",      "TEXT"),
        ("model",         "TEXT"),
        ("input_tokens",  "INTEGER DEFAULT 0"),
        ("output_tokens", "INTEGER DEFAULT 0"),
        ("cost_usd",      "REAL DEFAULT 0"),
        ("duration_ms",   "INTEGER DEFAULT 0"),
        ("date",          "TEXT"),
    ]:
        if col not in tel_cols:
            try:
                c.execute(f"ALTER TABLE telemetry ADD COLUMN {col} {definition}")
                print(f"[MIGRATION] telemetry: přidán sloupec {col}")
            except Exception as e:
                print(f"[MIGRATION] telemetry {col}: {e}")

    # 4. Fronta úkolů
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
    
    # 5. Zpětná vazba
    c.execute('''CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT,
        query TEXT,
        response TEXT,
        thumbs INTEGER,
        comment TEXT DEFAULT NULL,
        date TEXT
    )''')
    
    # 6. Noční analýza
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
    
    conn.commit()
    conn.close()

def save_session_history(history_list):
    """Uloží historii konverzace (SESSION_HISTORY) do SQLite."""
    try:
        data = json.dumps([
            {"role": "human" if isinstance(m, HumanMessage) else "ai",
             "content": m.content if isinstance(m.content, str) else ""}
            for m in history_list
        ])
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("CREATE TABLE IF NOT EXISTS session_state (key TEXT PRIMARY KEY, value TEXT)")
        cur.execute("INSERT OR REPLACE INTO session_state (key, value) VALUES ('history', ?)", (data,))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB] Chyba ukládání session: {e}")

def load_session_history():
    """Načte historii konverzace ze SQLite."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("CREATE TABLE IF NOT EXISTS session_state (key TEXT PRIMARY KEY, value TEXT)")
        cur.execute("SELECT value FROM session_state WHERE key='history'")
        row = cur.fetchone()
        conn.close()
        
        if not row:
            return []
            
        msgs = json.loads(row[0])
        return [
            HumanMessage(content=m["content"]) if m["role"] == "human"
            else AIMessage(content=m["content"])
            for m in msgs if m.get("content")
        ]
    except Exception as e:
        print(f"[DB] Chyba načítání session: {e}")
        return []
