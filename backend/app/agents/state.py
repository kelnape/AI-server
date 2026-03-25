# app/agents/state.py
from typing import TypedDict, Annotated, Sequence
import operator
from langchain_core.messages import BaseMessage

class AgentState(TypedDict):
    """Stav předávaný mezi všemi agenty v LangGraphu."""
    messages: Annotated[Sequence[BaseMessage], operator.add]
    iterations: int
    status: str
    route: str
    error_log: str
    plan: list[str]
    current_step: int
    model_id: str
    task_id: str
    project_specs: dict
    is_web_project: bool
    # Sdílená paměť agentů - předávání zkušeností mezi uzly
    agent_memory: dict
