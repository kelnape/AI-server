import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, FolderOpen, Upload, Image, FileText, Film, Music,
  Download, Trash2, Copy, Link, Eye, Grid, List,
  ChevronLeft, ChevronRight, Folder, File, RefreshCw,
  Check, AlertCircle, Maximize2, ZoomIn, ZoomOut, FolderUp
} from 'lucide-react';
import { apiFetch } from '../../api/client';

// Typy souborů a jejich ikony/barvy
const FILE_TYPES = {
  image: { icon: Image, color: 'text-emerald-400', bg: 'bg-emerald-500/10', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'] },
  video: { icon: Film, color: 'text-purple-400', bg: 'bg-purple-500/10', extensions: ['mp4', 'webm', 'mov', 'avi', 'mkv'] },
  audio: { icon: Music, color: 'text-pink-400', bg: 'bg-pink-500/10', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a'] },
  document: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10', extensions: ['pdf', 'doc', 'docx', 'txt', 'md', 'xlsx', 'pptx'] },
  folder: { icon: Folder, color: 'text-orange-400', bg: 'bg-orange-500/10', extensions: [] },
  other: { icon: File, color: 'text-gray-400', bg: 'bg-gray-500/10', extensions: [] },
};

const getFileType = (filename, isDir = false) => {
  if (isDir) return FILE_TYPES.folder;
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  for (const [key, type] of Object.entries(FILE_TYPES)) {
    if (type.extensions.includes(ext)) return { ...type, key };
  }
  return { ...FILE_TYPES.other, key: 'other' };
};

const formatSize = (bytes) => {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
  return `${bytes.toFixed(1)} ${units[i]}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const NasDrawer = ({ isOpen, onClose, onInsertToChat }) => {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [filter, setFilter] = useState('all'); // 'all' | 'image' | 'video' | 'document'
  const [selectedFile, setSelectedFile] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  
  // Clipboard state
  const [copied, setCopied] = useState(null);
  
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Načtení souborů
  const loadFiles = useCallback(async (path = currentPath) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/nas/list?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error('Nepodařilo se načíst soubory');
      const data = await res.json();
      setFiles(data.files || []);
      setCurrentPath(path);
    } catch (err) {
      setError(err.message);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    if (isOpen) loadFiles('/');
  }, [isOpen]);

  // Drag & Drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      await uploadFiles(droppedFiles, false);
    }
  };

  // Upload funkce - podporuje i složky se zachováním struktury
// Upload funkce - podporuje i složky se zachováním struktury
const uploadFiles = async (filesToUpload, preservePath = false) => {
  setUploading(true);
  setUploadProgress(0);
  setUploadStatus('');
  
  console.log('=== UPLOAD START ===');
  console.log('preservePath:', preservePath);
  console.log('currentPath:', currentPath);
  console.log('Files:', filesToUpload.map(f => ({ name: f.name, path: f.webkitRelativePath })));
  
  const total = filesToUpload.length;
  let completed = 0;
  
  // Pokud nahráváme složku, nejdřív vytvoříme všechny potřebné složky
  if (preservePath) {
    const foldersToCreate = new Set();
    
    for (const file of filesToUpload) {
      const relativePath = file.webkitRelativePath;
      console.log('Processing file:', file.name, 'relativePath:', relativePath);
      
      if (relativePath) {
        const pathParts = relativePath.split('/');
        pathParts.pop(); // odstraníme název souboru
        console.log('pathParts after pop:', pathParts);
        
        // Vytvoříme všechny úrovně složek
        let folderPath = '';
        for (const part of pathParts) {
          folderPath = folderPath ? `${folderPath}/${part}` : part;
          const fullPath = currentPath === '/' 
            ? '/' + folderPath 
            : currentPath + '/' + folderPath;
          console.log('Adding folder:', fullPath);
          foldersToCreate.add(fullPath);
        }
      }
    }
    
    console.log('Folders to create:', Array.from(foldersToCreate));
    
    // Seřadíme složky podle hloubky
    const sortedFolders = Array.from(foldersToCreate).sort((a, b) => 
      a.split('/').length - b.split('/').length
    );
    
    // Vytvoříme složky
    for (const folderPath of sortedFolders) {
      try {
        setUploadStatus(`Vytvářím složku: ${folderPath.split('/').pop()}`);
        console.log('Creating folder:', folderPath);
        const res = await apiFetch(`/api/nas/mkdir?path=${encodeURIComponent(folderPath)}`, {
          method: 'POST',
        });
        console.log('Mkdir response:', await res.json());
      } catch (err) {
        console.error('Mkdir error:', folderPath, err);
      }
    }
  }
  
  // Nahrajeme soubory
  for (const file of filesToUpload) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      let targetPath = currentPath;
      if (preservePath && file.webkitRelativePath) {
        const pathParts = file.webkitRelativePath.split('/');
        pathParts.pop();
        if (pathParts.length > 0) {
          targetPath = currentPath === '/' 
            ? '/' + pathParts.join('/') 
            : currentPath + '/' + pathParts.join('/');
        }
      }
      
      console.log('Uploading:', file.name, 'to:', targetPath);
            
      const res = await apiFetch(`/api/nas/upload?path=${encodeURIComponent(targetPath)}`, {
        method: 'POST',
        body: formData,
      });
      console.log('Upload response:', await res.json());
      
      completed++;
      setUploadProgress(Math.round((completed / total) * 100));
      setUploadStatus(`${file.name} (${completed}/${total})`);
    } catch (err) {
      console.error('Upload error:', err);
    }
  }
  
  console.log('=== UPLOAD COMPLETE ===');
  setUploading(false);
  setUploadProgress(0);
  setUploadStatus('');
  loadFiles(currentPath);
};

  // Handler pro nahrání složky
  const handleFolderUpload = (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    
    const files = Array.from(fileList);
    uploadFiles(files, true); // true = zachovat strukturu složek
    
    // Reset input
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  // Handler pro nahrání souborů
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadFiles(files, false);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Rychlé akce
  const handleDownload = async (file) => {
    try {
      const res = await apiFetch(`/api/nas/download?path=${encodeURIComponent(file.path)}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleDelete = async (file) => {
    if (!confirm(`Opravdu smazat "${file.name}"?`)) return;
    try {
      await apiFetch(`/api/nas/delete?path=${encodeURIComponent(file.path)}`, { method: 'DELETE' });
      loadFiles(currentPath);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleCopyLink = async (file) => {
    const link = `${window.location.origin}/api/nas/file?path=${encodeURIComponent(file.path)}`;
    await navigator.clipboard.writeText(link);
    setCopied(file.name);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleInsertToChat = (file) => {
    if (onInsertToChat) {
      onInsertToChat(file);
    }
    onClose();
  };

  // Navigace
  const navigateTo = (path) => {
    loadFiles(path);
  };

  const navigateUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    navigateTo('/' + parts.join('/'));
  };

  // Filtrované soubory
  const filteredFiles = files.filter(f => {
    if (filter === 'all') return true;
    const type = getFileType(f.name, f.is_dir);
    return type.key === filter;
  });

  // Obrázky pro lightbox
  const images = filteredFiles.filter(f => {
    const type = getFileType(f.name);
    return type.key === 'image';
  });

  const openLightbox = (file) => {
    const idx = images.findIndex(f => f.name === file.name);
    if (idx >= 0) {
      setLightboxIndex(idx);
      setLightboxOpen(true);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-4xl z-50 animate-in slide-in-from-right duration-300">
        <div 
          ref={dropZoneRef}
          className={`h-full flex flex-col border-l transition-all ${isDragging ? 'ring-4 ring-blue-500 ring-inset' : ''}`}
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Header */}
          <div className="shrink-0 px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-500/15 rounded-xl">
                <FolderOpen size={20} className="text-orange-400" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
                  kelnape-NAS
                </h2>
                <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {currentPath}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-all ${viewMode === 'grid' ? 'bg-blue-500/20 text-blue-400' : ''}`}
                  style={{ color: viewMode !== 'grid' ? 'var(--text-muted)' : undefined }}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-all ${viewMode === 'list' ? 'bg-blue-500/20 text-blue-400' : ''}`}
                  style={{ color: viewMode !== 'list' ? 'var(--text-muted)' : undefined }}
                >
                  <List size={16} />
                </button>
              </div>
              
              {/* Refresh */}
              <button
                onClick={() => loadFiles(currentPath)}
                className="p-2 rounded-lg hover:bg-white/5 transition-all"
                style={{ color: 'var(--text-muted)' }}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              
              {/* Close */}
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="shrink-0 px-6 py-3 border-b flex items-center gap-3 flex-wrap" style={{ borderColor: 'var(--border)' }}>
            {/* Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={navigateUp}
                disabled={currentPath === '/'}
                className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-all"
                style={{ color: 'var(--text-muted)' }}
              >
                <ChevronLeft size={18} />
              </button>
            </div>
            
            {/* Filter tabs */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
              {[
                { id: 'all', label: 'Vše' },
                { id: 'image', label: 'Fotky', icon: Image },
                { id: 'video', label: 'Videa', icon: Film },
                { id: 'document', label: 'Dokumenty', icon: FileText },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                    filter === tab.id ? 'bg-blue-500/20 text-blue-400' : ''
                  }`}
                  style={{ color: filter !== tab.id ? 'var(--text-muted)' : undefined }}
                >
                  {tab.icon && <tab.icon size={12} />}
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Upload buttons */}
            <div className="ml-auto flex items-center gap-2">
              {/* Upload soubory */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 rounded-xl text-blue-400 text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                <Upload size={14} />
                Nahrát
              </button>
              
              {/* Upload složka */}
              <button
                onClick={() => folderInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 rounded-xl text-orange-400 text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                <FolderUp size={14} />
                Složka
              </button>
            </div>
            
            {/* Hidden inputs */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
            <input
              ref={folderInputRef}
              type="file"
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={handleFolderUpload}
            />
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="shrink-0 px-6 py-2 bg-blue-500/10 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-blue-400">{uploadProgress}%</span>
              </div>
              {uploadStatus && (
                <p className="text-[9px] font-mono mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                  {uploadStatus}
                </p>
              )}
            </div>
          )}

          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="text-center">
                <Upload size={48} className="text-blue-400 mx-auto mb-4 animate-bounce" />
                <p className="text-lg font-bold text-blue-400">Přetáhni soubory sem</p>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-auto custom-scrollbar p-6">
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
                <AlertCircle size={18} className="text-red-400" />
                <span className="text-sm text-red-400">{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw size={32} className="text-blue-400 animate-spin" />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FolderOpen size={48} className="text-gray-500 mb-4" />
                <p style={{ color: 'var(--text-muted)' }}>Žádné soubory</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  Přetáhni sem soubory nebo klikni na "Nahrát"
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid view - galerie */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredFiles.map((file, idx) => {
                  const type = getFileType(file.name, file.is_dir);
                  const Icon = type.icon;
                  const isImage = type.key === 'image';
                  
                  return (
                    <div
                      key={file.name}
                      className="group relative rounded-xl border overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl cursor-pointer"
                      style={{ borderColor: 'var(--border)', background: 'var(--bg-item)' }}
                      onClick={() => file.is_dir ? navigateTo(file.path) : isImage ? openLightbox(file) : null}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-square relative overflow-hidden">
                        {isImage ? (
                          <img
                            src={`/api/nas/thumbnail?path=${encodeURIComponent(file.path)}`}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${type.bg}`}>
                            <Icon size={48} className={type.color} />
                          </div>
                        )}
                        
                        {/* Hover overlay s akcemi */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                          {isImage && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openLightbox(file); }}
                              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                            >
                              <Eye size={18} className="text-white" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                          >
                            <Download size={18} className="text-white" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCopyLink(file); }}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                          >
                            {copied === file.name ? <Check size={18} className="text-green-400" /> : <Link size={18} className="text-white" />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                            className="p-2 bg-red-500/50 hover:bg-red-500/70 rounded-lg transition-all"
                          >
                            <Trash2 size={18} className="text-white" />
                          </button>
                        </div>
                      </div>
                      
                      {/* File info */}
                      <div className="p-2">
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {file.name}
                        </p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          {formatSize(file.size)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List view */
              <div className="space-y-1">
                {filteredFiles.map((file) => {
                  const type = getFileType(file.name, file.is_dir);
                  const Icon = type.icon;
                  
                  return (
                    <div
                      key={file.name}
                      className="group flex items-center gap-3 p-3 rounded-xl border hover:bg-white/5 transition-all cursor-pointer"
                      style={{ borderColor: 'var(--border)', background: 'var(--bg-item)' }}
                      onClick={() => file.is_dir ? navigateTo(file.path) : null}
                    >
                      <div className={`p-2 rounded-lg ${type.bg}`}>
                        <Icon size={18} className={type.color} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {file.name}
                        </p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          {formatSize(file.size)} • {formatDate(file.modified)}
                        </p>
                      </div>
                      
                      {/* Quick actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                          className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
                          title="Stáhnout"
                        >
                          <Download size={14} className="text-blue-400" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCopyLink(file); }}
                          className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
                          title="Kopírovat odkaz"
                        >
                          {copied === file.name ? <Check size={14} className="text-green-400" /> : <Link size={14} style={{ color: 'var(--text-muted)' }} />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Smazat"
                        >
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-6 py-3 border-t flex items-center justify-between text-[10px] font-mono" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            <span>{filteredFiles.length} položek</span>
            <span>Přetáhni soubory pro upload</span>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center">
          {/* Close */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-all"
          >
            <X size={24} className="text-white" />
          </button>
          
          {/* Navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setLightboxIndex((lightboxIndex - 1 + images.length) % images.length)}
                className="absolute left-4 p-3 hover:bg-white/10 rounded-full transition-all"
              >
                <ChevronLeft size={32} className="text-white" />
              </button>
              <button
                onClick={() => setLightboxIndex((lightboxIndex + 1) % images.length)}
                className="absolute right-4 p-3 hover:bg-white/10 rounded-full transition-all"
              >
                <ChevronRight size={32} className="text-white" />
              </button>
            </>
          )}
          
          {/* Image */}
          <img
            src={`/api/nas/file?path=${encodeURIComponent(images[lightboxIndex].path)}`}
            alt={images[lightboxIndex].name}
            className="max-w-[90vw] max-h-[85vh] object-contain"
          />
          
          {/* Info */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-xl text-white text-sm">
            {images[lightboxIndex].name} • {lightboxIndex + 1} / {images.length}
          </div>
          
          {/* Actions */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <button
              onClick={() => handleDownload(images[lightboxIndex])}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
            >
              <Download size={18} className="text-white" />
            </button>
            <button
              onClick={() => handleCopyLink(images[lightboxIndex])}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all"
            >
              <Link size={18} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};