# app/agents/tools.py
import os
import subprocess
from datetime import datetime
from langchain_core.tools import tool
from langchain_core.messages import ToolMessage, AIMessage

# Importujeme konfiguraci z našeho nového souboru
from app.config import (
    SUDO_PASSWORD, GIT_REPO_PATH, GIT_TOKEN, 
    GIT_USER_EMAIL, GIT_USER_NAME
)

def _git_run(args: list[str], cwd: str = None) -> tuple[str, bool]:
    """Pomocná funkce pro Git příkazy - vrátí (výstup, úspěch)."""
    env = os.environ.copy()
    if GIT_TOKEN:
        env["GIT_ASKPASS"] = "echo"
        env["GIT_TOKEN"] = GIT_TOKEN
    try:
        r = subprocess.run(
            ["git"] + args,
            cwd=cwd or GIT_REPO_PATH,
            capture_output=True, text=True, timeout=60, env=env
        )
        out = (r.stdout + r.stderr).strip()
        return out, r.returncode == 0
    except Exception as e:
        return str(e), False

@tool
def execute_linux_command(command: str) -> str:
    """Spustí bash příkaz přímo na Linux serveru."""
    try:
        if command.strip().startswith("sudo ") and SUDO_PASSWORD:
            command = command.replace("sudo ", f"echo '{SUDO_PASSWORD}' | sudo -S ", 1)
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        output = (result.stdout + "\n" + result.stderr).strip()
        return output if output else "Příkaz proběhl (bez výstupu)."
    except Exception as e:
        return f"Chyba: {str(e)}"

@tool
def read_file(path: str, max_lines: int = 200) -> str:
    """
    Přečte obsah souboru ze serveru. Podporuje absolutní i relativní cesty.
    Relativní cesty jsou vztaženy k adresáři projektu.
    """
    try:
        full_path = path if os.path.isabs(path) else os.path.join(GIT_REPO_PATH, path)
        full_path = os.path.realpath(full_path)
        if not full_path.startswith("/home/") and not full_path.startswith(GIT_REPO_PATH):
            return f"❌ Přístup zamítnut: cesta mimo povolené adresáře."
        if not os.path.exists(full_path):
            return f"❌ Soubor nenalezen: {full_path}"
        if os.path.isdir(full_path):
            files = os.listdir(full_path)
            return f"  Adresář {full_path}:\n" + "\n".join(files[:100])
        size = os.path.getsize(full_path)
        if size > 500_000:
            return f"❌ Soubor příliš velký ({size//1024}KB)."
        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
        if len(lines) > max_lines:
            return (f"📄 {full_path} ({len(lines)} řádků, zobrazuji prvních {max_lines}):\n"
                    + "".join(lines[:max_lines]) + f"\n... (+{len(lines)-max_lines} dalších řádků)")
        return f"📄 {full_path} ({len(lines)} řádků):\n" + "".join(lines)
    except Exception as e:
        return f"❌ Chyba čtení: {str(e)}"

@tool
def write_file(path: str, content: str, mode: str = "overwrite") -> str:
    """Zapiše nebo upraví soubor na serveru."""
    try:
        full_path = path if os.path.isabs(path) else os.path.join(GIT_REPO_PATH, path)
        full_path = os.path.realpath(full_path)
        if not full_path.startswith("/home/") and not full_path.startswith(GIT_REPO_PATH):
            return f"❌ Zápis zamítnut: cesta mimo povolené adresáře."
        
        protected = [
            ".env", "system_data.db", "chroma_db",
            "main.py", "App.jsx", "vite.config", "package.json",
            "requirements.txt", "Dockerfile", ".gitignore",
        ]
        if any(p in full_path for p in protected):
            return f"❌ Zápis zamítnut: chráněný soubor."
            
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        if mode == "append":
            with open(full_path, "a", encoding="utf-8") as f:
                f.write(content)
            return f"✅ Přidáno na konec souboru: {full_path} ({len(content)} znaků)"
        else:
            if os.path.exists(full_path):
                import shutil
                shutil.copy2(full_path, full_path + ".bak")
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)
            return f"✅ Soubor uložen: {full_path} ({len(content.splitlines())} řádků)"
    except Exception as e:
        return f"❌ Chyba zápisu: {str(e)}"

@tool
def git_operation(operation: str, message: str = "", branch: str = "") -> str:
    """Provádí Git operace v repozitáři projektu."""
    op = operation.strip().lower()

    if op == "status":
        out, _ = _git_run(["status", "--short", "--branch"])
        return out or "Čistý repozitář."
    elif op == "log":
        out, _ = _git_run(["log", "--oneline", "--graph", "--decorate", "-15"])
        return out or "Žádné commity."
    elif op == "diff":
        out, _ = _git_run(["diff", "--stat"])
        return out or "Žádné změny."
    elif op == "add":
        out, ok = _git_run(["add", "-A"])
        return f"✅ Staged: {out}" if ok else f"❌ {out}"
    elif op == "commit":
        if not message:
            message = f"Auto-commit: {datetime.now().strftime('%d.%m.%Y %H:%M')}"
        _git_run(["config", "user.email", GIT_USER_EMAIL])
        _git_run(["config", "user.name", GIT_USER_NAME])
        out, ok = _git_run(["commit", "-m", message])
        return f"✅ Commit: {out}" if ok else f"❌ {out}"
    elif op == "push":
        out, ok = _git_run(["push"])
        return f"✅ Push: {out}" if ok else f"❌ Push selhal: {out}"
    elif op == "pull":
        out, ok = _git_run(["pull", "--rebase"])
        return f"✅ Pull: {out}" if ok else f"❌ Pull selhal: {out}"
    elif op == "branch":
        out, _ = _git_run(["branch", "-a"])
        return out or "Žádné větve."
    elif op == "checkout":
        if not branch: return "❌ Chybí název větve."
        out, ok = _git_run(["checkout", branch])
        return f"✅ {out}" if ok else f"❌ {out}"
    elif op == "stash":
        out, ok = _git_run(["stash"])
        return f"✅ Stash: {out}" if ok else f"❌ {out}"
    else:
        out, ok = _git_run(operation.split())
        return out

@tool
def search_internet(query: str) -> str:
    """Hledá technické informace na internetu přes DuckDuckGo."""
    try:
        from langchain_community.tools import DuckDuckGoSearchRun
        return DuckDuckGoSearchRun().run(query)
    except Exception as e:
        return f"Vyhledávání selhalo: {str(e)}"

# Mapování a kolekce nástrojů pro snadný import v uzlech (nodes)
TOOLS_MAP = {
    "execute_linux_command": execute_linux_command,
    "search_internet": search_internet,
    "git_operation": git_operation,
    "read_file": read_file,
    "write_file": write_file,
}

ALL_TOOLS = [execute_linux_command, search_internet, git_operation, read_file, write_file]
SYSADMIN_TOOLS = [execute_linux_command, git_operation, read_file, write_file]
RESEARCH_TOOLS = [search_internet]

def execute_tool_calls(ai_message: AIMessage) -> list[ToolMessage]:
    """Helper pro provedení zavolaných nástrojů z LLM."""
    results = []
    if not hasattr(ai_message, "tool_calls") or not ai_message.tool_calls:
        return results
    for tc in ai_message.tool_calls:
        tool_fn = TOOLS_MAP.get(tc["name"])
        try:
            output = tool_fn.invoke(tc["args"]) if tool_fn else f"Neznámý nástroj: {tc['name']}"
        except Exception as e:
            output = f"Chyba nástroje: {str(e)}"
        results.append(ToolMessage(content=str(output), tool_call_id=tc["id"]))
    return results
