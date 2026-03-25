# app/agents/utils.py
import os
import time
import re
from langchain_openai import ChatOpenAI
try:
    from langchain_anthropic import ChatAnthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
from langchain_core.messages import AIMessage

# Tady bys importoval funkci pro uložení telemetrie do DB
# from app.database import save_telemetry 
from app.config import AVAILABLE_MODELS, ACTIVE_MODEL, GIT_REPO_PATH
from app.agents.tools import ALL_TOOLS

# Zkrácená ukázka pro build_llm a _llm_tracked
def build_llm(model_id: str = None):
    mid = model_id or ACTIVE_MODEL
    info = AVAILABLE_MODELS.get(mid, AVAILABLE_MODELS["gpt-4o-mini"])
    if info["provider"] == "anthropic":
        if not ANTHROPIC_AVAILABLE or not os.getenv("ANTHROPIC_API_KEY"):
            raise RuntimeError("Chybí Anthropic konfigurace.")
        return ChatAnthropic(model=mid, temperature=0.1, max_tokens=4096)
    return ChatOpenAI(model=mid, temperature=0.1)

def _msgs(state, max_messages: int = 20, max_chars: int = 60000):
    """Vrátí zprávy z historie s chytrým ořezáváním (první + N posledních)."""
    msgs = list(state["messages"])
    if len(msgs) <= max_messages:
        return msgs
    # ... (Zde vlož původní logiku ořezávání zpráv z tvého main.py)
    return [msgs[0]] + msgs[-(max_messages-1):]

def team_identity_with_context(agent_id: str = "") -> str:
    """Vrátí identitu týmu obohacenou o živý kontext projektu (git, cesty)."""
    # ... (Zde vlož původní logiku build_project_context z main.py)
    return f"Jsi členem AI týmu ({agent_id}). Pracovní adresář: {GIT_REPO_PATH}..."

def _llm_tracked(state, agent_id: str, with_tools: bool = False):
    """Wrapper, který měří tokeny a čas (telemetrie)."""
    llm = build_llm(state.get("model_id") or ACTIVE_MODEL)
    if with_tools:
        llm = llm.bind_tools(ALL_TOOLS)
    
    class TrackedLLM:
        def invoke(self, messages):
            # ... (Zde vlož původní try/except logiku a volání save_telemetry)
            return llm.invoke(messages)
    return TrackedLLM()
