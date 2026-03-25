# app/services/file_parser.py
import base64
import io
from pydantic import BaseModel
from typing import Optional
from langchain_core.messages import HumanMessage

try:
    from pypdf import PdfReader
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False

# Pydantic model z tvého main.py
class FileData(BaseModel):
    name: str
    type: str
    mime: str
    data: str

class ProcessedFiles:
    def __init__(self):
        self.has_images: bool = False
        self.has_pdfs: bool = False
        self.has_text: bool = False
        self.image_blocks: list = []
        self.text_summary: str = ""
        self.file_names: list = []

def process_files(files: list) -> ProcessedFiles:
    """
    Zpracuje přiložené soubory:
    - Obrázky -> base64 bloky pro OpenAI Vision
    - PDF     -> extrakce textu přes pypdf
    - Text/kód -> přímé přečtení obsahu
    """
    result = ProcessedFiles()
    if not files:
        return result

    text_parts = []

    for f in files:
        name = f.name
        mime = f.mime
        result.file_names.append(name)

        # Odstraníme data URI prefix (data:image/png;base64,...)
        raw_data = f.data
        if "," in raw_data:
            raw_data = raw_data.split(",", 1)[1]

        # --- OBRÁZKY -> Vision ---
        if mime.startswith("image/"):
            result.has_images = True
            result.image_blocks.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime};base64,{raw_data}",
                    "detail": "high"
                }
            })

        # --- PDF -> extrakce textu ---
        elif mime == "application/pdf" or name.lower().endswith(".pdf"):
            result.has_pdfs = True
            if PYPDF_AVAILABLE:
                try:
                    pdf_bytes = base64.b64decode(raw_data)
                    reader = PdfReader(io.BytesIO(pdf_bytes))
                    pages_text = []
                    for i, page in enumerate(reader.pages[:20]):  # max 20 stran
                        text = page.extract_text()
                        if text and text.strip():
                            pages_text.append(f"[Strana {i+1}]\n{text.strip()}")
                    if pages_text:
                        extracted = "\n\n".join(pages_text)
                        text_parts.append(
                            f"📄 PDF SOUBOR: {name} ({len(reader.pages)} stran)\n"
                            f"{'='*50}\n{extracted[:8000]}"
                            f"{'...[zkráceno]' if len(extracted) > 8000 else ''}"
                        )
                    else:
                        text_parts.append(f"📄 PDF SOUBOR: {name} - nepodařilo se extrahovat text (pravděpodobně skenovaný obrázek).")
                except Exception as e:
                    text_parts.append(f"📄 PDF SOUBOR: {name} - chyba při čtení: {str(e)}")
            else:
                text_parts.append(
                    f"📄 PDF SOUBOR: {name} - pypdf není nainstalován.\n"
                    f"Spusť: pip install pypdf"
                )

        # --- TEXTOVÉ SOUBORY / KÓD ---
        elif mime.startswith("text/") or any(name.endswith(ext) for ext in [
            ".py", ".js", ".ts", ".jsx", ".tsx", ".json", ".yaml", ".yml",
            ".md", ".txt", ".sh", ".bash", ".html", ".css", ".csv", ".xml",
            ".env", ".toml", ".ini", ".cfg", ".conf", ".log"
        ]):
            result.has_text = True
            try:
                decoded = base64.b64decode(raw_data).decode("utf-8", errors="replace")
                ext = name.rsplit(".", 1)[-1] if "." in name else "txt"
                text_parts.append(
                    f"  SOUBOR: {name}\n"
                    f"```{ext}\n{decoded[:6000]}"
                    f"{'...[zkráceno]' if len(decoded) > 6000 else ''}\n```"
                )
            except Exception as e:
                text_parts.append(f"  SOUBOR: {name} - chyba při čtení: {str(e)}")

        # --- OSTATNÍ ---
        else:
            text_parts.append(f"📎 PŘÍLOHA: {name} (typ: {mime}) - binární soubor, nelze zobrazit jako text.")

    result.text_summary = "\n\n".join(text_parts)
    return result

def build_human_message(text: str, processed: ProcessedFiles) -> HumanMessage:
    """
    Sestaví HumanMessage - buď prostý text, nebo multimodální
    obsah pro Vision (text + obrázky).
    """
    parts = []

    # Textová část zprávy uživatele
    full_text = text
    if processed.text_summary:
        full_text = f"{text}\n\n{processed.text_summary}" if text else processed.text_summary

    if full_text:
        parts.append({"type": "text", "text": full_text})

    # Obrazové bloky (Vision)
    parts.extend(processed.image_blocks)

    if len(parts) == 1 and parts[0]["type"] == "text":
        # Pouze text - prostý HumanMessage (kompatibilní se všemi modely)
        return HumanMessage(content=parts[0]["text"])
    elif parts:
        # Multimodální obsah
        return HumanMessage(content=parts)
    else:
        return HumanMessage(content=text or "(prázdná zpráva)")

# --- DOCKER & VECTOR DB ---
try:
    docker_client = docker.from_env()
    # Předstáhni obrazy pro rychlý start testování
    def _pull_docker_images():
        for img in ["python:3.11-slim", "node:20-slim", "bash:5"]:
            try: docker_client.images.pull(img)
            except: pass
    import threading
    threading.Thread(target=_pull_docker_images, daemon=True).start()
except Exception:
    docker_client = None

vector_db = None
try:
    if not os.path.exists(CHROMA_PATH):
        os.makedirs(CHROMA_PATH)
    vector_db = Chroma(persist_directory=CHROMA_PATH, embedding_function=OpenAIEmbeddings())
except Exception:
    pass
