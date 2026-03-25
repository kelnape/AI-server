import sqlite3
from app.config import DB_PATH

def run_migration():
    print(f"🔄 Připojuji se k databázi: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    try:
        # Používáme správný název sloupce 'prompt'
        cur.execute("SELECT agent_id, prompt FROM agent_prompts")
        rows = cur.fetchall()
    except sqlite3.OperationalError:
        print("⚠️ Tabulka agent_prompts zatím neexistuje. Není co migrovat.")
        return

    if not rows:
        print("ℹ️ Databáze promptů je prázdná, není co migrovat.")
        return

    migration_map = {
        "Výzkumník": "SPECIALISTA",
        "Expert": "SPECIALISTA",
        "Architekt": "VÝVOJÁŘ",
        "Kodér": "VÝVOJÁŘ",
        "Auditor": "QA",
        "Tester": "QA",
        "Reflektor": "ANALYTIK",
        "Manažer": "MANAŽER",
        "Plánovač": "PLÁNOVAČ",
        "SysAdmin": "SYSADMIN",
        "Finalizér": "FINALIZÉR"
    }

    new_prompts = {}
    
    for old_id, text in rows:
        if not text: continue
        new_id = migration_map.get(old_id, old_id.upper())
        if new_id in new_prompts:
            new_prompts[new_id] += f"\n\n--- Původní instrukce z: {old_id} ---\n{text}"
        else:
            new_prompts[new_id] = text

    cur.execute("DELETE FROM agent_prompts")
    
    for new_id, combined_text in new_prompts.items():
        cur.execute("INSERT INTO agent_prompts (agent_id, prompt) VALUES (?, ?)", (new_id, combined_text))

    conn.commit()
    conn.close()
    print("✅ Úspěch! Prompty byly sloučeny a převedeny na novou strukturu.")

if __name__ == "__main__":
    run_migration()