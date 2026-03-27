import traceback
import json
import sqlite3
import subprocess
import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.config import DB_PATH, ACTIVE_MODEL

try:
    from app.agents.memory import search_memory, get_vector_db
except ImportError:
    def search_memory(query, k=3): return ""
    def get_vector_db(): return None

try:
    from langchain_tavily import TavilySearch
    search_tool = TavilySearch(k=3)
except ImportError:
    search_tool = None

BASE_TEAM_IDENTITY = "Jsi členem elitního týmu AI agentů. Spolupracuj na vyřešení úkolu."

def build_llm(model_id=None):
    from app.config import ACTIVE_MODEL
    m_id = model_id or ACTIVE_MODEL or "gpt-4o-mini"
    if "claude" in str(m_id).lower():
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model="claude-sonnet-4-5-20250929", 
            api_key=os.getenv("ANTHROPIC_API_KEY"), 
            temperature=0.2 # Snížená teplota, ať zbytečně nebásní
        )
    return ChatOpenAI(model=m_id, temperature=0.2)

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
            cur.execute("CREATE TABLE IF NOT EXISTS telemetry (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT, agent_id TEXT, input_tokens INTEGER, output_tokens INTEGER, cost_usd REAL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)")
            cur.execute("INSERT INTO telemetry (task_id, agent_id, input_tokens, output_tokens, cost_usd) VALUES (?, ?, ?, ?, ?)", (task_id, role_name, in_t, out_t, cost))
            conn.commit()
            conn.close()
    except Exception: pass
    return res

# =============================================================================
# JEDNOTLIVÍ AGENTI (TVRDÉ INSTRUKCE)
# =============================================================================

async def manazer_node(state: dict):
    try:
        direct_agent = state.get("direct_agent")
        if direct_agent:
            return {"messages": [AIMessage(content=f"→ {direct_agent}", name="MANAŽER")], "route": direct_agent}
            
        user_msg = state["messages"][-1].content.lower()
        if "diadem" in user_msg or "vbs" in user_msg:
            return {"messages": [AIMessage(content="Detekován DIAdem", name="MANAŽER")], "route": "Specialista"}
        if any(word in user_msg for word in ["excel", "vba", "makro", "tabulk"]):
            return {"messages": [AIMessage(content="Detekován Excel", name="MANAŽER")], "route": "Excel"}
            
        relevant_memory = search_memory(user_msg, k=3)
        memory_context = f"\n\n### PAMĚŤ:\n{relevant_memory}\n" if relevant_memory else ""

        instr = f"Jsi MANAŽER. Odpověz POUZE JEDNÍM klíčovým slovem.\n{memory_context}\n1. Web/Analýza -> SPECIALISTA\n2. Kód/Skripty -> VYVOJAR\n3. Testy -> QA\n4. Systém -> SYSADMIN\n5. Excel -> EXCEL"
        res = await invoke_and_log(state, "MANAŽER", instr)
        txt = _safe_text(res.content).upper()
        
        route = "Finalizer"
        if "SYSADMIN" in txt: route = "SysAdmin"
        elif any(w in txt for w in ["SPECIALISTA", "ANALÝZA"]): route = "Specialista"
        elif any(w in txt for w in ["QA", "AUDIT"]): route = "QA"
        elif any(w in txt for w in ["VYVOJAR", "KÓD", "PROGRAM"]): route = "Vyvojar"
        elif any(w in txt for w in ["EXCEL", "VBA"]): route = "Excel"

        return {"messages": [AIMessage(content=txt, name="MANAŽER")], "route": route}
    except Exception as e:
        return {"messages": [AIMessage(content=f"❌ Chyba: {str(e)}", name="MANAŽER")], "route": "Finalizer"}

async def planner_node(state: dict):
    res = await invoke_and_log(state, "PLÁNOVAČ", "Vytvoř plán.")
    return {"messages": [AIMessage(content=_safe_text(res.content), name="PLÁNOVAČ")]}

async def specialist_node(state: dict):
    instr = "Jsi SPECIALISTA. Buď stručný. Bez zbytečné omáčky."
    res = await invoke_and_log(state, "SPECIALISTA", instr)
    return {"messages": [AIMessage(content=_safe_text(res.content), name="SPECIALISTA")]}

async def developer_node(state: dict):
    instr = (
        "Jsi VÝVOJÁŘ. Tvůj úkol je napsat POUZE ČISTÝ KÓD. "
        "Máš ABSOLUTNÍ ZÁKAZ psát jakýkoliv text okolo. Zákaz vysvětlování. "
        "Pokud jsi požádán o kód, vrať jen a pouze syntaxi kódu."
    )
    res = await invoke_and_log(state, "VÝVOJÁŘ", instr)
    return {"messages": [AIMessage(content=_safe_text(res.content), name="VÝVOJÁŘ")], "iterations": state.get("iterations", 0) + 1}

async def qa_node(state: dict):
    instr = (
        "Jsi přísný QA INŽENÝR. Zkontroluj předchozí kód od Vývojáře. "
        "Máš ABSOLUTNÍ ZÁKAZ přepisovat nebo opakovat kód! "
        "Pokud kód funguje, tvá odpověď musí být POUZE JEDNO SLOVO: SCHVÁLENO "
        "Pokud nefunguje, napiš FAIL a vypiš chyby. Nic víc."
    )
    res = await invoke_and_log(state, "QA", instr)
    txt = _safe_text(res.content)
    verdict = "PASS" if "SCHVÁLENO" in txt.upper() else "FAIL"
    return {"messages": [AIMessage(content=txt, name="QA")], "status": verdict}

async def sysadmin_node(state: dict):
    res = await invoke_and_log(state, "SYSADMIN", "Jsi SYSADMIN. Stručně.")
    return {"messages": [AIMessage(content=_safe_text(res.content), name="SYSADMIN")]}

async def reflector_node(state: dict):
    res = await invoke_and_log(state, "ANALYTIK", "Zhodnoť řešení.")
    return {"messages": [AIMessage(content=_safe_text(res.content), name="ANALYTIK")]}

async def finalizer_node(state: dict):
    res = await invoke_and_log(state, "FINALIZÉR", "Závěrečné shrnutí úkolu.")
    return {"messages": [AIMessage(content=_safe_text(res.content), name="FINALIZÉR")]}

async def excel_node(state: dict):
    custom_prompts = load_agent_prompts()
    instr = custom_prompts.get("EXCEL", "Jsi Excel Expert. Vrať jen čistý VBA kód.")
    res = await invoke_and_log(state, "EXCEL", instr)
    return {"messages": [AIMessage(content=_safe_text(res.content), name="EXCEL")]}

async def next_step_node(state: dict):
    return {"current_step": state.get("current_step", -1) + 1}