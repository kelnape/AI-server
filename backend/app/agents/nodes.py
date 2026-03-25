import traceback
import json
import sqlite3
import subprocess
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.config import DB_PATH, ACTIVE_MODEL

# Zabezpečený import paměti
try:
    from app.agents.memory import search_memory, get_vector_db
except ImportError:
    def search_memory(query, k=3): return ""
    def get_vector_db(): return None

# Zabezpečený import Tavily
try:
    from langchain_tavily import TavilySearch
    search_tool = TavilySearch(k=3)
except ImportError:
    search_tool = None
    print("⚠️ TavilySearch chybí. Vyhledávání na webu je vypnuto.")

BASE_TEAM_IDENTITY = "Jsi členem elitního týmu AI agentů. Spolupracuj na vyřešení úkolu."
SYSTEM_ALERTS = []

def telegram_notify(msg: str):
    print(f"📢 [TELEGRAM] {msg}")

def build_llm(model_id=None):
    from app.config import ACTIVE_MODEL
    m_id = model_id or ACTIVE_MODEL or "gpt-4o-mini"
    if "claude" in str(m_id).lower():
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model="claude-sonnet-4-5-20250929", 
            api_key=os.getenv("ANTHROPIC_API_KEY"), 
            temperature=0.7
        )
    return ChatOpenAI(model=m_id, temperature=0.7)

def load_agent_prompts():
    prompts = {}
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("CREATE TABLE IF NOT EXISTS agent_prompts (agent_id TEXT PRIMARY KEY, custom_prompt TEXT, updated_at TEXT)")
        cur.execute("SELECT agent_id, custom_prompt FROM agent_prompts")
        for aid, prompt in cur.fetchall():
            prompts[aid] = prompt
        conn.close()
    except Exception: pass
    return prompts

def _get_agent_setup(state: dict, role_name: str, role_desc: str):
    llm = build_llm(state.get("model_id"))
    custom_prompts = load_agent_prompts()
    custom_prompt = custom_prompts.get(role_name, "")
    full_prompt = f"{BASE_TEAM_IDENTITY}\n\nTvoje role: {role_name}\nTvoje instrukce: {role_desc}\n\n{custom_prompt}"
    return llm, SystemMessage(content=full_prompt.strip())

def _safe_text(content):
    if isinstance(content, list):
        return " ".join([b.get("text", "") for b in content if isinstance(b, dict)])
    return str(content)

# --- CENTRÁLNÍ LOGOVÁNÍ TELEMETRIE ---
async def invoke_and_log(state: dict, role_name: str, role_desc: str):
    llm, sys_msg = _get_agent_setup(state, role_name, role_desc)
    res = await llm.ainvoke([sys_msg] + state["messages"])
    try:
        usage = res.usage_metadata or {}
        in_t = usage.get("input_tokens", 0)
        out_t = usage.get("output_tokens", 0)
        
        if in_t > 0 or out_t > 0:
            task_id = state.get("task_id", "default_task")
            cost = (in_t * 0.00015 / 1000) + (out_t * 0.00060 / 1000)
            
            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS telemetry (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id TEXT,
                    agent_id TEXT,
                    input_tokens INTEGER,
                    output_tokens INTEGER,
                    cost_usd REAL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("INSERT INTO telemetry (task_id, agent_id, input_tokens, output_tokens, cost_usd) VALUES (?, ?, ?, ?, ?)", 
                        (task_id, role_name, in_t, out_t, cost))
            conn.commit()
            conn.close()
            print(f"📊 [TELEMETRIE] Agent '{role_name}' spotřeboval {in_t+out_t} tokenů (Cena: ${cost:.5f})")
    except Exception as e:
        print(f"⚠️ Chyba při zápisu telemetrie: {e}")
    return res

# =============================================================================
# JEDNOTLIVÍ AGENTI
# =============================================================================

async def manager_node(state: dict):
    try:
        direct_agent = state.get("direct_agent")
        if direct_agent:
            return {"messages": [AIMessage(content=f"→ {direct_agent}", name="MANAŽER")], "route": direct_agent}
            
        user_msg = state["messages"][-1].content.lower()
        # CHYTRÝ FILTR: Je to opravdu DIAdem?
        is_diadem = "diadem" in user_msg or "vbs" in user_msg
        
        project_specs = state.get("project_specs", {})
        # Vnutíme DIAdem cestu jen tehdy, když to uživatel skutečně zmínil v textu!
        if project_specs.get("project_type") == "diadem_vbs" and is_diadem:
            return {"messages": [AIMessage(content="Deleguji na Specialistu pro DIAdem", name="MANAŽER")], "route": "Specialista"}
            
        relevant_memory = search_memory(user_msg, k=3)
        memory_context = f"\n\n### PAMĚŤ:\n{relevant_memory}\n" if relevant_memory else ""

        # Vyčištěno slovo DIAdem z obecných instrukcí
        instr = f"Jsi MANAŽER. Deleguj práci. Odpověz JEDNÍM klíčovým slovem.\n{memory_context}\n1. Web/Analýza/Znalosti -> SPECIALISTA\n2. Kód/Architektura -> VYVOJAR\n3. Testy/Audit -> QA\n4. Systém/Server -> SYSADMIN\n5. Plán -> PLANNER"
        
        response = await invoke_and_log(state, "MANAŽER", instr)
        txt = _safe_text(response.content).upper()
        
        route = "Finalizer"
        if any(w in txt for w in ["SYSADMIN", "SYSTÉM", "SERVER"]): route = "SysAdmin"
        elif any(w in txt for w in ["RESEARCH", "SPECIALISTA", "EXPERT", "ANALÝZA"]): route = "Specialista"
        elif any(w in txt for w in ["TESTER", "AUDIT", "QA", "KONTROLA"]): route = "QA"
        elif any(w in txt for w in ["KODÉR", "VYVOJAR", "VÝVOJÁŘ", "PROGRAMUJ", "KÓD"]): route = "Vyvojar"
        elif any(w in txt for w in ["PLÁN", "PLANNER"]): route = "Planner"
        elif any(w in txt for w in ["ANALYTIK", "REFLEKTOR"]): route = "Reflektor"

        return {"messages": [AIMessage(content=txt, name="MANAŽER")], "route": route}
    except Exception as e:
        traceback.print_exc()
        return {"messages": [AIMessage(content=f"❌ Chyba: {str(e)}", name="MANAŽER")], "route": "Finalizer"}

async def planner_node(state: dict):
    res = await invoke_and_log(state, "PLÁNOVAČ", "Vytvoř detailní plán.")
    return {"messages": [AIMessage(content=_safe_text(res.content), name="PLÁNOVAČ")]}

async def specialist_node(state: dict):
    try:
        user_query = state["messages"][-1].content
        user_query_lower = user_query.lower()
        # CHYTRÝ FILTR PRO OMEZENÍ MODULŮ
        is_diadem = "diadem" in user_query_lower or "vbs" in user_query_lower
        
        search_context = ""
        if search_tool and any(w in user_query_lower for w in ["najdi", "zjisti", "vyhledej"]):
            sr = await search_tool.ainvoke(user_query)
            search_context = f"\nData z webu:\n{sr}\n"
            
        module_context = ""
        # Přilepíme restrikce pro moduly pouze u DIAdem úkolů
        if is_diadem:
            project_specs = state.get("project_specs", {})
            mod_str = ", ".join(project_specs.get("diadem_modules", []))
            if mod_str:
                module_context = f"\n🚨 OMEZENÍ MODULŮ DIADEM: {mod_str}."
            
        instr = f"Jsi SPECIALISTA. Analyzuj a navrhni řešení.{search_context}{module_context}"
        res = await invoke_and_log(state, "SPECIALISTA", instr)
        return {"messages": [AIMessage(content=_safe_text(res.content), name="SPECIALISTA")]}
    except Exception as e:
        return {"messages": [AIMessage(content=f"⚠️ Specialista chyba: {str(e)}", name="SPECIALISTA")]}

async def developer_node(state: dict):
    res = await invoke_and_log(state, "VÝVOJÁŘ", "NAPIŠ ČISTÝ KÓD. Zákaz zbytečného textu.")
    return {"messages": [AIMessage(content=_safe_text(res.content), name="VÝVOJÁŘ")], "iterations": state.get("iterations", 0) + 1}

async def qa_node(state: dict):
    instr = "Jsi QA INŽENÝR. Zkontroluj kód. Bez chyb -> napiš SCHVÁLENO. Jinak FAIL a vypiš chyby."
    res = await invoke_and_log(state, "QA", instr)
    txt = _safe_text(res.content)
    verdict = "PASS" if "SCHVÁLENO" in txt.upper() else "FAIL"
    return {"messages": [AIMessage(content=txt, name="QA")], "status": verdict}

async def sysadmin_node(state: dict):
    sys_context = "Systém běží normálně."
    try: sys_context = f"CPU jádra: {subprocess.run(['nproc'], capture_output=True, text=True, timeout=1).stdout.strip()}"
    except: pass
    instr = f"Jsi SYSADMIN. OS data:\n{sys_context}\nOdpověz."
    res = await invoke_and_log(state, "SYSADMIN", instr)
    return {"messages": [AIMessage(content=_safe_text(res.content), name="SYSADMIN")]}

async def reflector_node(state: dict):
    res = await invoke_and_log(state, "ANALYTIK", "Zhodnoť řešení.")
    return {"messages": [AIMessage(content=_safe_text(res.content), name="ANALYTIK")]}

async def finalizer_node(state: dict):
    res = await invoke_and_log(state, "FINALIZÉR", "Shrň práci.")
    return {"messages": [AIMessage(content=_safe_text(res.content), name="FINALIZÉR")]}

async def nextstep_node(state: dict):
    return {"current_step": state.get("current_step", -1) + 1}

manazer_node = manager_node
planner_node = planner_node
specialist_node = specialist_node
developer_node = developer_node
qa_node = qa_node
sysadmin_node = sysadmin_node
reflektor_node = reflector_node
next_step_node = nextstep_node
finalizer_node = finalizer_node