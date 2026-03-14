from typing import TypedDict, Annotated, Sequence
from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
import operator

# Importy pro různé modely (předpokládá nastavené API klíče v prostředí)
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

# ---------------------------------------------------------
# 1. NASTAVENÍ MODELŮ (Různé modely pro různé agenty)
# ---------------------------------------------------------
# Architekt (Šéf) - Výborný na kontext a architekturu
llm_architekt = ChatAnthropic(model="claude-3-5-sonnet-20240620", temperature=0.2)

# Auditor (Kontrolor) - Skvělý analytik s obřím oknem pro detaily
llm_auditor = ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0)

# Kodér (Opravář) - Rychlý a efektivní na jasné instrukce
llm_koder = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)


# ---------------------------------------------------------
# 2. DEFINICE STAVU (Co si agenti předávají)
# ---------------------------------------------------------
class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add] # Historie zpráv/kódu
    iterations: int  # Počítadlo smyček, abychom se nezasekli
    status: str      # "PASS" nebo "FAIL"


# ---------------------------------------------------------
# 3. DEFINICE AGENTŮ (Uzly grafu)
# ---------------------------------------------------------
def architekt_node(state: AgentState):
    print("👷 [Architekt] Vytvářím prvotní návrh kódu...")
    
    # Architekt dostane původní zadání (první zprávu)
    system_prompt = SystemMessage(content="Jsi hlavní Architekt. Tvým úkolem je napsat čistý a funkční kód podle zadání uživatele. Vrať POUZE kód a stručné vysvětlení.")
    messages = [system_prompt] + state["messages"]
    
    response = llm_architekt.invoke(messages)
    return {"messages": [response], "iterations": state.get("iterations", 0), "status": "PENDING"}


def auditor_node(state: AgentState):
    print("🕵️ [Auditor] Kontroluji kód...")
    
    last_message = state["messages"][-1].content
    system_prompt = SystemMessage(content="""Jsi přísný Auditor kódu. Zkontroluj kód v předchozí zprávě. 
    Pokud je kód zcela bez chyb a splňuje zadání, odpověz PŘESNĚ slovem 'PASS'. 
    Pokud najdeš chyby, napiš detailní chybový report, co je špatně, a odpověď začni slovem 'FAIL:'.""")
    
    response = llm_auditor.invoke([system_prompt, HumanMessage(content=last_message)])
    
    # Vyhodnocení odpovědi Auditora
    if "PASS" in response.content.upper()[:10]:
        status = "PASS"
        print("✅ [Auditor] Kód schválen!")
    else:
        status = "FAIL"
        print("❌ [Auditor] Nalezeny chyby, předávám Kodérovi.")
        
    return {"messages": [response], "iterations": state.get("iterations", 0) + 1, "status": status}


def koder_node(state: AgentState):
    print("🔧 [Kodér] Opravuji kód podle reportu...")
    
    # Kodér potřebuje znát původní kód i výtky Auditora
    system_prompt = SystemMessage(content="Jsi Kodér opravář. Dostaneš předchozí kód a chybový report. Oprav kód PŘESNĚ podle instrukcí Auditora a vrať pouze opravený kód.")
    messages = [system_prompt] + state["messages"][-2:] # Vezmeme návrh a report
    
    response = llm_koder.invoke(messages)
    return {"messages": [response]}


# ---------------------------------------------------------
# 4. LOGIKA SMYČKY (Rozhodovací funkce)
# ---------------------------------------------------------
def route_after_audit(state: AgentState):
    # Pokud Auditor řekl PASS, nebo jsme dosáhli limitu 3 oprav, končíme
    if state["status"] == "PASS":
        return "konec"
    elif state["iterations"] >= 3:
        print("⚠️ Dosažen maximální počet iterací. Končím smyčku.")
        return "konec"
    else:
        return "opravit"


# ---------------------------------------------------------
# 5. SESTAVENÍ GRAFU
# ---------------------------------------------------------
workflow = StateGraph(AgentState)

# Přidání uzlů
workflow.add_node("Architekt", architekt_node)
workflow.add_node("Auditor", auditor_node)
workflow.add_node("Koder", koder_node)

# Propojení uzlů (Edges)
workflow.set_entry_point("Architekt")
workflow.add_edge("Architekt", "Auditor")

# Zde je ta hlavní magie - Podmíněné větvení
workflow.add_conditional_edges(
    "Auditor",
    route_after_audit,
    {
        "opravit": "Koder",
        "konec": END
    }
)

# Z Kodéra jde kód VŽDY zpět k Auditorovi na novou kontrolu
workflow.add_edge("Koder", "Auditor")

# Kompilace grafu
app = workflow.compile()

# ---------------------------------------------------------
# 6. SPUŠTĚNÍ
# ---------------------------------------------------------
if __name__ == "__main__":
    zadani = "Napiš jednoduchou Python hru 'Kámen, nůžky, papír', která hraje proti počítači a ošetři špatné vstupy uživatele."
    print(f"Zadání pro šéfa: {zadani}\n" + "-"*40)
    
    initial_state = {"messages": [HumanMessage(content=zadani)], "iterations": 0}
    
    # Spuštění stroje
    for output in app.stream(initial_state):
        # Můžeme sledovat, kterým uzlem to právě prošlo
        pass 
    
    print("-" * 40)
    print("🎉 FINÁLNÍ VÝSLEDEK (Kód prošel celým procesem):")
    # Vytiskneme úplně poslední zprávu v historii (finální kód)
    final_state = app.get_state(initial_state) # Získáme konečný stav
    # Poznámka: v reálném běhu app.stream ukládá výstupy z uzlů