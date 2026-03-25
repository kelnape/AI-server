# app/agents/graph.py
from langgraph.graph import StateGraph, END
from app.agents.state import AgentState

from app.agents.nodes import (
    manazer_node, planner_node, sysadmin_node, 
    specialist_node, developer_node, qa_node, 
    reflektor_node, next_step_node, finalizer_node
)

workflow = StateGraph(AgentState)

workflow.add_node("Manažer", manazer_node)
workflow.add_node("Planner", planner_node)
workflow.add_node("SysAdmin", sysadmin_node)
workflow.add_node("Specialista", specialist_node)
workflow.add_node("Vyvojar", developer_node)
workflow.add_node("QA", qa_node)
workflow.add_node("Reflektor", reflektor_node)
workflow.add_node("Nextstep", next_step_node)
workflow.add_node("Finalizer", finalizer_node)

workflow.set_entry_point("Manažer")

# Bezpečný router pro Manažera
def safe_manager_router(s):
    route = s.get("route")
    if not route or route == "":
        return "Finalizer" # Fallback
    return route

workflow.add_conditional_edges(
    "Manažer",
    safe_manager_router,
    {
        "Planner": "Planner",
        "Specialista": "Specialista",
        "Vyvojar": "Vyvojar",
        "QA": "QA",
        "SysAdmin": "SysAdmin",
        "Reflektor": "Reflektor",
        "Finalizer": "Finalizer"
    }
)

workflow.add_edge("Planner", "Vyvojar")
workflow.add_edge("SysAdmin", "Finalizer")
workflow.add_edge("Specialista", "Vyvojar")
workflow.add_edge("Vyvojar", "QA")

def qa_router(s):
    if s.get("status") == "PASS" or s.get("iterations", 0) >= 3:
        return "Reflektor"
    return "Vyvojar"

workflow.add_conditional_edges("QA", qa_router, {"Reflektor": "Reflektor", "Vyvojar": "Vyvojar"})

workflow.add_conditional_edges(
    "Reflektor",
    lambda s: "Nextstep" if s.get("plan") and s.get("current_step", -1) < len(s.get("plan", [])) - 1 else "Finalizer",
    {"Nextstep": "Nextstep", "Finalizer": "Finalizer"}
)

workflow.add_edge("Nextstep", "Vyvojar")
workflow.add_edge("Finalizer", END)

agent_app = workflow.compile()