# app/routers/nas.py
# Backend API pro NAS operace - list, upload, download, delete, thumbnails

import os
import shutil
from pathlib import Path
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Query, HTTPException
from fastapi.responses import FileResponse, Response
from PIL import Image
import io

router = APIRouter(prefix="/api/nas", tags=["nas"])

# Konfigurace - uprav podle svého nastavení
from app.config import NAS_PATH as NAS_BASE_PATH
THUMBNAIL_SIZE = (200, 200)
ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'}

def get_safe_path(path: str) -> Path:
    """Bezpečně resolve path aby se zabránilo path traversal"""
    base = Path(NAS_BASE_PATH).resolve()
    requested = (base / path.lstrip('/')).resolve()
    
    # Kontrola že je path uvnitř NAS_BASE_PATH
    if not str(requested).startswith(str(base)):
        raise HTTPException(status_code=403, detail="Přístup zamítnut")
    
    return requested


@router.get("/list")
async def list_files(path: str = Query(default="/")):
    """Vypíše soubory a složky v dané cestě"""
    try:
        target_path = get_safe_path(path)
        
        if not target_path.exists():
            return {"files": [], "path": path}
        
        if not target_path.is_dir():
            raise HTTPException(status_code=400, detail="Cesta není složka")
        
        files = []
        for item in sorted(target_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
            try:
                stat = item.stat()
                relative_path = "/" + str(item.relative_to(Path(NAS_BASE_PATH)))
                
                files.append({
                    "name": item.name,
                    "path": relative_path,
                    "is_dir": item.is_dir(),
                    "size": stat.st_size if item.is_file() else None,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "extension": item.suffix.lower() if item.is_file() else None,
                })
            except (PermissionError, OSError):
                continue
        
        return {
            "files": files,
            "path": path,
            "parent": str(Path(path).parent) if path != "/" else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    path: str = Query(default="/")
):
    """Nahraje soubor do NAS"""
    try:
        target_dir = get_safe_path(path)
        
        if not target_dir.exists():
            target_dir.mkdir(parents=True, exist_ok=True)
        
        if not target_dir.is_dir():
            raise HTTPException(status_code=400, detail="Cílová cesta není složka")
        
        # Bezpečný název souboru
        safe_filename = Path(file.filename).name
        target_file = target_dir / safe_filename
        
        # Pokud soubor existuje, přepiš ho (bez přidávání čísla)
        # Ulož soubor
        with open(target_file, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        return {
            "success": True,
            "filename": target_file.name,
            "path": "/" + str(target_file.relative_to(Path(NAS_BASE_PATH))),
            "size": len(content)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download")
async def download_file(path: str = Query(...)):
    """Stáhne soubor z NAS"""
    try:
        target_file = get_safe_path(path)
        
        if not target_file.exists():
            raise HTTPException(status_code=404, detail="Soubor nenalezen")
        
        if not target_file.is_file():
            raise HTTPException(status_code=400, detail="Cesta není soubor")
        
        return FileResponse(
            path=str(target_file),
            filename=target_file.name,
            media_type="application/octet-stream"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/file")
async def get_file(path: str = Query(...)):
    """Vrátí soubor s MIME typem (pro zobrazení v prohlížeči)"""
    try:
        target_file = get_safe_path(path)
        
        if not target_file.exists():
            raise HTTPException(status_code=404, detail="Soubor nenalezen")
        
        if not target_file.is_file():
            raise HTTPException(status_code=400, detail="Cesta není soubor")
        
        # Jednoduchá detekce MIME typu
        suffix = target_file.suffix.lower()
        mime_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mp3': 'audio/mpeg',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.html': 'text/html',
            '.json': 'application/json',
        }
        
        return FileResponse(
            path=str(target_file),
            media_type=mime_types.get(suffix, 'application/octet-stream')
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/thumbnail")
async def get_thumbnail(path: str = Query(...)):
    """Vrátí thumbnail obrázku"""
    try:
        target_file = get_safe_path(path)
        
        if not target_file.exists():
            raise HTTPException(status_code=404, detail="Soubor nenalezen")
        
        suffix = target_file.suffix.lower()
        if suffix not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Není obrázek")
        
        # SVG vrátíme přímo
        if suffix == '.svg':
            return FileResponse(path=str(target_file), media_type='image/svg+xml')
        
        # Pro ostatní vytvoříme thumbnail
        try:
            with Image.open(target_file) as img:
                # Konverze RGBA na RGB pro JPEG
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                
                # Vytvoření thumbnails
                img.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
                
                # Uložení do bufferu
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=80)
                buffer.seek(0)
                
                return Response(
                    content=buffer.getvalue(),
                    media_type='image/jpeg',
                    headers={'Cache-Control': 'max-age=86400'}  # Cache na 24h
                )
        
        except Exception as e:
            # Pokud thumbnail selže, vrátíme placeholder
            raise HTTPException(status_code=500, detail=f"Chyba při vytváření náhledu: {str(e)}")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete")
async def delete_file(path: str = Query(...), recursive: bool = Query(default=True)):
    """Smaže soubor nebo složku (volitelně rekurzivně)"""
    try:
        target = get_safe_path(path)
        
        if not target.exists():
            raise HTTPException(status_code=404, detail="Soubor nenalezen")
        
        # Bezpečnostní kontrola - nesmazat root
        if target == Path(NAS_BASE_PATH).resolve():
            raise HTTPException(status_code=403, detail="Nelze smazat kořenovou složku")
        
        if target.is_file():
            target.unlink()
        elif target.is_dir():
            if recursive:
                # Rekurzivní mazání složky i s obsahem
                shutil.rmtree(target)
            else:
                # Smaže pouze prázdné složky
                if any(target.iterdir()):
                    raise HTTPException(status_code=400, detail="Složka není prázdná")
                target.rmdir()
        
        return {"success": True, "deleted": path}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mkdir")
async def create_directory(path: str = Query(...)):
    """Vytvoří novou složku (pokud neexistuje)"""
    try:
        target = get_safe_path(path)
        
        # Pokud složka již existuje, vrátíme success
        if target.exists():
            return {
                "success": True,
                "path": "/" + str(target.relative_to(Path(NAS_BASE_PATH))),
                "existed": True
            }
        
        target.mkdir(parents=True, exist_ok=True)
        
        return {
            "success": True,
            "path": "/" + str(target.relative_to(Path(NAS_BASE_PATH))),
            "existed": False
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_stats():
    """Vrátí statistiky NAS (volné místo atd.)"""
    try:
        base_path = Path(NAS_BASE_PATH)
        
        if not base_path.exists():
            return {"error": "NAS není dostupný"}
        
        # Statistiky disku
        stat = shutil.disk_usage(base_path)
        
        # Počet souborů (pouze první úroveň pro rychlost)
        file_count = sum(1 for _ in base_path.rglob('*') if _.is_file())
        dir_count = sum(1 for _ in base_path.rglob('*') if _.is_dir())
        
        return {
            "total": stat.total,
            "used": stat.used,
            "free": stat.free,
            "percent_used": round((stat.used / stat.total) * 100, 1),
            "file_count": file_count,
            "dir_count": dir_count,
            "path": NAS_BASE_PATH
        }
    
    except Exception as e:
        return {"error": str(e)}