import subprocess
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import GIT_REPO_PATH

router = APIRouter()

def run_git(cmd_list):
    """Pomocná funkce pro bezpečné spouštění Git příkazů v terminálu."""
    try:
        result = subprocess.run(
            ["git"] + cmd_list,
            cwd=GIT_REPO_PATH,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=400, detail=e.stderr or e.stdout or "Git příkaz selhal")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
def get_status():
    """Vrátí aktuální stav repozitáře ve struktuře, kterou frontend potřebuje."""
    # 1. Kontrola, jestli složka .git existuje
    if not os.path.exists(os.path.join(GIT_REPO_PATH, ".git")):
        return {
            "status": "uninitialized",
            "branch": "",
            "remote": "",
            "changed": [],
            "commits": [],
            "ahead": 0,
            "behind": 0,
            "clean": True
        }
    
    try:
        # Získání větve
        branch_out = run_git(["rev-parse", "--abbrev-ref", "HEAD"])
        
        # Získání remote info (odkud stahujeme/posíláme)
        try:
            remote_out = run_git(["remote", "-v"]).split('\n')[0]
        except:
            remote_out = "Žádný remote (repozitář je pouze lokální)"

        # Získání změněných souborů
        status_out = run_git(["status", "--porcelain"])
        changed_files = []
        if status_out:
            for line in status_out.split('\n'):
                if len(line) > 2:
                    st_code = line[:2]
                    filename = line[3:]
                    # Namapování kódu gitu na to, co frontend očekává
                    status_str = 'modified'
                    if '?' in st_code: status_str = 'untracked'
                    elif 'A' in st_code: status_str = 'added'
                    elif 'D' in st_code: status_str = 'deleted'
                    elif 'R' in st_code: status_str = 'renamed'
                    
                    changed_files.append({"status": status_str, "file": filename})
        
        # Získání historie commitů (posledních 5)
        try:
            log_out = run_git(["log", "-5", "--oneline"])
            commits = log_out.split('\n') if log_out else ["Žádné commity"]
        except:
            commits = ["Žádné commity"]

        # Zjištění ahead/behind (kolik commitů nám chybí nebo máme navíc oproti serveru)
        ahead = 0
        behind = 0
        try:
            run_git(["fetch"]) # Zkusíme potichu stáhnout info
            status_full = run_git(["status", "-sb"])
            if "ahead" in status_full: ahead = int(''.join(filter(str.isdigit, status_full.split('ahead')[1].split(',')[0])))
            if "behind" in status_full: behind = int(''.join(filter(str.isdigit, status_full.split('behind')[1].split(']')[0])))
        except:
            pass # Pokud to nejde, necháme to na 0

        # Posíláme to přesně tak, jak to GitDrawer očekává!
        return {
            "status": "ok",
            "branch": branch_out,
            "remote": remote_out,
            "changed": changed_files,
            "commits": commits,
            "ahead": ahead,
            "behind": behind,
            "clean": len(changed_files) == 0
        }
    except HTTPException as e:
        return {"status": "error", "error_msg": str(e.detail)}

class CommitRequest(BaseModel):
    message: str
    push: bool = False # Přidali jsme tohle z UI

@router.post("/commit")
def commit_changes(req: CommitRequest):
    """Přidá a zaloguje (commitne) změny."""
    steps = []
    try:
        # Přidání
        run_git(["add", "."])
        steps.append({"step": "add", "ok": True, "out": "Všechny změny přidány"})
        
        # Commit
        commit_msg = req.message if req.message else "Auto-commit změn"
        try:
            commit_out = run_git(["commit", "-m", commit_msg])
            steps.append({"step": "commit", "ok": True, "out": commit_out})
        except HTTPException as e:
            if "nothing to commit" in str(e.detail).lower() or "nic k zápisu" in str(e.detail).lower():
                steps.append({"step": "commit", "ok": True, "out": "Nebyly nalezeny žádné změny k uložení."})
            else:
                raise e

        # Push (pokud je vyžadován a máme nastavený remote)
        if req.push:
            try:
                push_out = run_git(["push"])
                steps.append({"step": "push", "ok": True, "out": push_out})
            except Exception as e:
                steps.append({"step": "push", "ok": False, "out": f"Nelze odeslat na remote server (možná není nastaven) {str(e)}"})

        return {"status": "ok", "steps": steps}
    except Exception as e:
        return {"status": "error", "steps": steps + [{"step": "error", "ok": False, "out": str(e)}]}

@router.post("/pull")
def pull_changes():
    try:
        out = run_git(["pull"])
        return {"status": "ok", "out": out}
    except Exception as e:
        return {"status": "error", "out": str(e)}