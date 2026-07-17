import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import {
  FileText, FolderPlus, Plus, Search, ChevronDown, ChevronRight,
  Edit2, Trash2, PanelRightClose, PanelRightOpen,
  BookMarked, Settings, Palette, FolderOpen, Pin, RotateCcw
} from 'lucide-react';

function Sidebar() {
  const {
    folders, notes, selectedNoteId, selectedFolderId, searchQuery,
    selectNote, selectFolder, createNote, createFolder, updateNote, updateFolder,
    deleteFolder, togglePinNote, duplicateNote, deleteNote,
    permanentlyDeleteNote, restoreNote, emptyTrash,
    setSearchQuery, sidebarWidth, setSidebarWidth, setShowSettings,
    sidebarCollapsed, toggleSidebarCollapsed, showTrash, setShowTrash,
  } = useStore();

  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderRenaming, setFolderRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([...folders.map(f => f.id)]));
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; folderId: string } | null>(null);
  const [showFolderColorPicker, setShowFolderColorPicker] = useState<string | null>(null);
  const [showMoveFolderDialog, setShowMoveFolderDialog] = useState<string | null>(null);

  const filteredNotes = useStore((s) => s.getFilteredNotes());
  const FOLDER_COLORS = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db','#9b59b6','#e84393','#6c5ce7','#fd79a8','#00b894','#636e72'];

  const buildFolderTree = (parentId: string | null, depth: number = 0): React.ReactNode[] => {
    return folders
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((folder) => {
        const hasChildren = folders.some((f) => f.parentId === folder.id);
        const isExpanded = expandedFolders.has(folder.id);
        const noteCount = notes.filter((n) => n.folderId === folder.id).length;
        const isActive = selectedFolderId === folder.id && !showTrash;

        return (
          <React.Fragment key={folder.id}>
            <div
              className={`folder-item ${isActive ? 'active' : ''}`}
              style={depth > 0 ? { paddingLeft: 16 + depth * 20 } : {}}
              onClick={() => { setShowTrash(false); selectFolder(folder.id); setExpandedFolders((prev) => { const next = new Set(prev); next.add(folder.id); return next; }); }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, folderId: folder.id });
              }}
            >
              <span
                style={{ cursor: 'pointer', display: 'flex', marginRight: 2 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedFolders((prev) => {
                    const next = new Set(prev);
                    next.has(folder.id) ? next.delete(folder.id) : next.add(folder.id);
                    return next;
                  });
                }}
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </span>
              <span className="folder-dot" style={{ background: folder.color }} />
              {folderRenaming === folder.id ? (
                <input className="input" style={{ padding: '2px 6px', fontSize: 13 }}
                  value={renameValue} autoFocus onFocus={(e) => e.target.select()}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => { if (renameValue.trim()) updateFolder(folder.id, { name: renameValue.trim() }); setFolderRenaming(null); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { if (renameValue.trim()) updateFolder(folder.id, { name: renameValue.trim() }); setFolderRenaming(null); }
                    if (e.key === 'Escape') setFolderRenaming(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="folder-name">{folder.name}</span>
              )}
              <span className="folder-count">{noteCount}</span>
            </div>
            {isExpanded && hasChildren && buildFolderTree(folder.id, depth + 1)}
          </React.Fragment>
        );
      });
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const handleMouseMove = (e: MouseEvent) => { setSidebarWidth(startWidth + e.clientX - startX); };
    const handleMouseUp = () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth, setSidebarWidth]);

  useEffect(() => { const handler = () => setContextMenu(null); document.addEventListener('click', handler); return () => document.removeEventListener('click', handler); }, []);
  useEffect(() => { if (sidebarCollapsed) setExpandedFolders(new Set()); }, [sidebarCollapsed]);

  if (sidebarCollapsed) {
    return (
      <div className="sidebar sidebar-collapsed">
        <div className="sidebar-collapsed-top">
          <button className="sidebar-icon-btn" onClick={() => setShowSettings(true)} title="设置"><Settings size={18} /></button>
          <button className="sidebar-icon-btn" onClick={toggleSidebarCollapsed} title="展开侧边栏"><PanelRightOpen size={18} /></button>
        </div>
        <div className="sidebar-collapsed-nav">
          <button className="sidebar-icon-btn" onClick={() => { setShowTrash(false); selectFolder(null); }} title="全部笔记"><FileText size={18} /></button>
          <span className="sidebar-collapsed-separator" />
          {folders.filter(f => !f.parentId).map(folder => (
            <button key={folder.id} className="sidebar-icon-btn"
              onClick={() => { setShowTrash(false); selectFolder(folder.id); }}
              title={folder.name} style={{ color: folder.color }}>
              <span className="folder-dot" style={{ background: folder.color, width: 16, height: 16 }} />
            </button>
          ))}
          <span className="sidebar-collapsed-separator" />
          <button className="sidebar-icon-btn" onClick={() => setShowTrash(true)} title="回收站"><Trash2 size={18} /></button>
          <span className="sidebar-collapsed-separator" />
        </div>
        <div className="sidebar-collapsed-new">
          <button className="sidebar-icon-btn" onClick={() => { toggleSidebarCollapsed(); setTimeout(() => createNote(), 50); }} title="新建笔记"><Plus size={18} /></button>
          <button className="sidebar-icon-btn" onClick={() => { toggleSidebarCollapsed(); setTimeout(() => { setShowNewFolderInput(true); }, 50); }} title="新建文件夹"><FolderPlus size={18} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar" style={{ width: sidebarWidth }}>
      <div className="sidebar-header">
        <h1><BookMarked size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />VideoNote</h1>
        <div className="sidebar-actions">
          <button className="sidebar-icon-btn" onClick={() => setShowSettings(true)} title="设置"><Settings size={16} /></button>
          <button className="sidebar-icon-btn" onClick={toggleSidebarCollapsed} title="折叠侧边栏"><PanelRightClose size={16} /></button>
        </div>
      </div>

      <div className="search-container">
        <div className="search-wrapper">
          <Search size={14} className="search-icon" />
          <input className="search-input" placeholder="搜索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div className="folder-section">
        <div className={`folder-item all-notes-item ${selectedFolderId === null && !showTrash ? 'active' : ''}`}
          onClick={() => { setShowTrash(false); selectFolder(null); }}>
          <span className="folder-dot" /> <span className="folder-name">全部笔记</span>
          <span className="folder-count">{notes.length}</span>
        </div>
        {buildFolderTree(null)}
        <div className={`folder-item ${showTrash ? 'active' : ''}`}
          onClick={() => setShowTrash(true)}
          style={{ borderTop: '1px solid var(--border)', marginTop: 4 }}>
          <span className="folder-dot" style={{ background: 'var(--text-muted)' }} />
          <span className="folder-name">回收站</span>
          <span className="folder-count">{notes.filter(n => n.deletedAt).length}</span>
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="btn btn-secondary btn-sm" onClick={() => { if (showNewFolderInput && newFolderName.trim()) { createFolder(newFolderName.trim(), selectedFolderId); setNewFolderName(''); setShowNewFolderInput(false); } else { setShowNewFolderInput(true); setNewFolderName(''); } }} style={{ flex: 1 }}>
          <FolderPlus size={14} /> {showNewFolderInput ? '确认' : '新建文件夹'}
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => createNote()} style={{ flex: 1 }}>
          <Plus size={14} /> 新建笔记
        </button>
      </div>
      {showNewFolderInput && (
        <div style={{ padding: '4px 12px 8px' }}>
          <input className="input" placeholder="文件夹名称" value={newFolderName} autoFocus
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && newFolderName.trim()) { createFolder(newFolderName.trim(), selectedFolderId); setNewFolderName(''); setShowNewFolderInput(false); } if (e.key === 'Escape') setShowNewFolderInput(false); }} />
        </div>
      )}

      <div className="note-list-section">
        {showTrash ? (() => {
          const trashed = notes.filter(n => n.deletedAt);
          if (trashed.length === 0) return <div className="empty-state"><p>回收站为空</p></div>;
          return (
            <>
              <div className="note-list-header">
                <span>回收站</span>
                <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('确定清空回收站？此操作不可恢复。')) emptyTrash(); }}><Trash2 size={12} /> 清空</button>
              </div>
              {trashed.sort((a, b) => new Date(b.deletedAt as string).getTime() - new Date(a.deletedAt as string).getTime()).map(note => (
                <div key={note.id} className="note-item" style={note.color ? { borderLeftColor: note.color } : {}}>
                  <div className="note-item-title"><span>{note.title || '未命名笔记'}</span></div>
                  <div className="note-item-meta">
                    <span>删除于 {new Date(note.deletedAt as string).toLocaleDateString('zh-CN')}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => restoreNote(note.id)}><RotateCcw size={12} /> 恢复</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm('确定永久删除？')) permanentlyDeleteNote(note.id); }}><Trash2 size={12} /> 永久删除</button>
                  </div>
                </div>
              ))}
            </>
          );
        })() : selectedFolderId ? (() => {
          const folderNotes = notes.filter(n => n.folderId === selectedFolderId);
          if (folderNotes.length === 0) return <div className="empty-state"><p>此文件夹暂无笔记</p></div>;
          return folderNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(note => (
            <div key={note.id} className={`note-item ${selectedNoteId === note.id ? 'active' : ''}`}
              style={note.color ? { borderLeftColor: note.color } : {}} onClick={() => selectNote(note.id)}>
              <div className="note-item-title">{note.pinned && <Pin size={12} className="pin-icon" />}<span>{note.title || '未命名笔记'}</span></div>
              <div className="note-item-preview">{note.content.replace(/[#*`>\[\]()_~]/g, '').substring(0, 80) || '空笔记'}</div>
              <div className="note-item-meta">
                <span>{new Date(note.updatedAt).toLocaleDateString('zh-CN')}</span>
                {(note.wordCount ?? 0) > 0 && <span>{note.wordCount} 字</span>}
                {note.videoInfo && <span className="note-item-video-badge">Bilibili</span>}
              </div>
            </div>
          ));
        })() : searchQuery ? (
          filteredNotes.length > 0 ? filteredNotes.map(note => (
            <div key={note.id} className={`note-item ${selectedNoteId === note.id ? 'active' : ''}`}
              style={note.color ? { borderLeftColor: note.color } : {}} onClick={() => selectNote(note.id)}>
              <div className="note-item-title">{note.pinned && <Pin size={12} className="pin-icon" />}<span>{note.title || '未命名笔记'}</span></div>
              <div className="note-item-preview">{note.content.replace(/[#*`>\[\]()_~]/g, '').substring(0, 80) || '空笔记'}</div>
              <div className="note-item-meta">
                <span>{new Date(note.updatedAt).toLocaleDateString('zh-CN')}</span>
                {(note.wordCount ?? 0) > 0 && <span>{note.wordCount} 字</span>}
                {note.videoInfo && <span className="note-item-video-badge">Bilibili</span>}
              </div>
            </div>
          )) : <div className="empty-state"><p>未找到匹配的笔记</p></div>
        ) : (
          <>
            {notes.filter(n => !n.folderId).length > 0 && (
              <div className="note-list-group">
                <div className="note-list-group-header">未分类</div>
                {notes.filter(n => !n.folderId).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(note => (
                  <div key={note.id} className={`note-item ${selectedNoteId === note.id ? 'active' : ''}`}
                    style={note.color ? { borderLeftColor: note.color } : {}} onClick={() => selectNote(note.id)}>
                    <div className="note-item-title"><span>{note.title || '未命名笔记'}</span></div>
                    <div className="note-item-preview">{note.content.replace(/[#*`>\[\]()_~]/g, '').substring(0, 80) || '空笔记'}</div>
                    <div className="note-item-meta"><span>{new Date(note.updatedAt).toLocaleDateString('zh-CN')}</span></div>
                  </div>
                ))}
              </div>
            )}
            {folders.filter(f => !f.parentId).map(folder => {
              const fNotes = notes.filter(n => n.folderId === folder.id);
              if (fNotes.length === 0) return null;
              return (
                <div key={folder.id} className="note-list-group">
                  <div className="note-list-group-header" style={{ borderLeftColor: folder.color }}
                    onClick={() => selectFolder(folder.id)}>
                    <span className="folder-dot" style={{ background: folder.color, width: 6, height: 6 }} />
                    <span>{folder.name}</span> <span className="folder-count">{fNotes.length}</span>
                  </div>
                  {fNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5).map(note => (
                    <div key={note.id} className={`note-item ${selectedNoteId === note.id ? 'active' : ''}`}
                      style={note.color ? { borderLeftColor: note.color } : {}} onClick={() => selectNote(note.id)}>
                      <div className="note-item-title">{note.pinned && <Pin size={12} className="pin-icon" />}<span>{note.title || '未命名笔记'}</span></div>
                      <div className="note-item-preview">{note.content.replace(/[#*`>\[\]()_~]/g, '').substring(0, 80) || '空笔记'}</div>
                      <div className="note-item-meta"><span>{new Date(note.updatedAt).toLocaleDateString('zh-CN')}</span></div>
                    </div>
                  ))}
                  {fNotes.length > 5 && (
                    <div className="note-list-group-more" onClick={() => selectFolder(folder.id)}>查看全部 {fNotes.length} 篇 &gt;</div>
                  )}
                </div>
              );
            })}
            {folders.filter(f => !f.parentId).length === 0 && notes.filter(n => !n.folderId).length === 0 && (
              <div className="empty-state"><p>暂无笔记</p></div>
            )}
          </>
        )}
      </div>

      <div className="sidebar-resize-handle" onMouseDown={handleMouseDown} />

      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <div className="context-menu-item" onClick={() => { setFolderRenaming(contextMenu.folderId); setRenameValue(folders.find(f => f.id === contextMenu.folderId)?.name || ''); setContextMenu(null); }}>
            <Edit2 size={14} /> 重命名</div>
          <div className="context-menu-item" onClick={() => { createFolder('新建子文件夹', contextMenu.folderId); setContextMenu(null); }}>
            <FolderPlus size={14} /> 新建子文件夹</div>
          <div className="context-menu-item" onClick={() => { setShowMoveFolderDialog(contextMenu.folderId); setContextMenu(null); }}>
            <FolderOpen size={14} /> 移动到...</div>
          <div className="context-menu-item" onClick={() => { setShowFolderColorPicker(contextMenu.folderId); setContextMenu(null); }}>
            <Palette size={14} /> 更改配色</div>
          <div className="context-menu-divider" />
          <div className="context-menu-item danger" onClick={() => { deleteFolder(contextMenu.folderId); setContextMenu(null); }}>
            <Trash2 size={14} /> 删除</div>
        </div>
      )}

      {showFolderColorPicker && (
        <div className="modal-overlay" onClick={() => setShowFolderColorPicker(null)}>
          <div className="modal" style={{ maxWidth: 300 }} onClick={(e) => e.stopPropagation()}>
            <h2>选择文件夹颜色</h2>
            <div className="color-picker" style={{ justifyContent: 'center' }}>
              {FOLDER_COLORS.map(color => (
                <span key={color}
                  className={`color-option ${folders.find(f => f.id === showFolderColorPicker)?.color === color ? 'selected' : ''}`}
                  style={{ background: color, width: 32, height: 32 }}
                  onClick={() => { updateFolder(showFolderColorPicker, { color }); setShowFolderColorPicker(null); }} />
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowFolderColorPicker(null)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {showMoveFolderDialog && (
        <div className="modal-overlay" onClick={() => setShowMoveFolderDialog(null)}>
          <div className="modal" style={{ maxWidth: 350 }} onClick={(e) => e.stopPropagation()}>
            <h2>移动文件夹到...</h2>
            <div className="move-list">
              <button className="move-item" onClick={() => { const id = showMoveFolderDialog; setShowMoveFolderDialog(null); updateFolder(id, { parentId: null }); }}>
                <FileText size={14} /> <span>（顶级目录）</span>
              </button>
              {folders.filter(f => f.id !== showMoveFolderDialog).map(f => (
                <button key={f.id} className="move-item"
                  onClick={() => { const id = showMoveFolderDialog; setShowMoveFolderDialog(null); updateFolder(id, { parentId: f.id }); }}>
                  <span className="folder-dot" style={{ background: f.color }} /> <span>{f.name}</span>
                </button>
              ))}
            </div>
            <div className="modal-footer" style={{ marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowMoveFolderDialog(null)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;