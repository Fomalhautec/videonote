import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import {
  FileText, FolderPlus, Plus, Search, ChevronDown, ChevronRight,
  Edit2, Trash2, PanelRightClose, PanelRightOpen,
  BookMarked, Settings, Palette, FolderOpen, Pin, RotateCcw, Copy
} from 'lucide-react';

function Sidebar() {
  const {
    folders, notes, selectedNoteId, selectedFolderId, searchQuery,
    selectNote, selectFolder, createNote, createFolder, updateNote, updateFolder,
    deleteFolder, togglePinNote, duplicateNote, deleteNote,
    permanentlyDeleteNote, restoreNote, emptyTrash,
    setSearchQuery, sidebarWidth, setSidebarWidth, setShowSettings,
    sidebarCollapsed, toggleSidebarCollapsed, showTrash, setShowTrash, setNoteColor,
  } = useStore();

  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderRenaming, setFolderRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([...folders.map(f => f.id)]));
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; noteId?: string; folderId?: string } | null>(null);
  const [showFolderColorPicker, setShowFolderColorPicker] = useState<string | null>(null);
  const [showNoteColorPicker, setShowNoteColorPicker] = useState<string | null>(null);
  const [showMoveFolderDialog, setShowMoveFolderDialog] = useState<string | null>(null);
  const [showMoveNoteDialog, setShowMoveNoteDialog] = useState<string | null>(null);

  const filteredNotes = useStore((s) => s.getFilteredNotes());
  const FOLDER_COLORS = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db','#9b59b6','#e84393','#6c5ce7','#fd79a8','#00b894','#636e72'];
  const NOTE_COLORS = [
    { value: '', label: '无' }, { value: '#e74c3c', label: '红' }, { value: '#e67e22', label: '橙' },
    { value: '#f1c40f', label: '黄' }, { value: '#2ecc71', label: '绿' }, { value: '#1abc9c', label: '青' },
    { value: '#3498db', label: '蓝' }, { value: '#9b59b6', label: '紫' }, { value: '#e84393', label: '粉' },
    { value: '#6c5ce7', label: '紫罗兰' }, { value: '#fd79a8', label: '浅粉' },
  ];

  const buildFolderTree = (parentId: string | null, depth: number = 0) => {
    return folders
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((folder) => {
        const hasChildren = folders.some((f) => f.parentId === folder.id);
        const isExpanded = expandedFolders.has(folder.id);
        const noteCount = notes.filter((n) => n.folderId === folder.id && !n.deletedAt).length;
        const isActive = selectedFolderId === folder.id && !showTrash;
        return (
          <React.Fragment key={folder.id}>
            <div className={`folder-item ${isActive ? 'active' : ''}`}
              style={depth ? { paddingLeft: 16 + depth * 20 } : {}}
              onClick={() => { setShowTrash(false); selectFolder(folder.id); setExpandedFolders(p => { const n = new Set(p); n.add(folder.id); return n; }); }}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, folderId: folder.id }); }}>
              <span style={{ cursor: 'pointer', display: 'flex', marginRight: 2 }}
                onClick={(e) => { e.stopPropagation(); setExpandedFolders(p => { const n = new Set(p); n.has(folder.id) ? n.delete(folder.id) : n.add(folder.id); return n; }); }}>
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </span>
              <span className="folder-dot" style={{ background: folder.color }} />
              {folderRenaming === folder.id ? (
                <input className="input" style={{ padding: '2px 6px', fontSize: 13 }} value={renameValue} autoFocus
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => { if (renameValue.trim()) updateFolder(folder.id, { name: renameValue.trim() }); setFolderRenaming(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && renameValue.trim()) { updateFolder(folder.id, { name: renameValue.trim() }); setFolderRenaming(null); } if (e.key === 'Escape') setFolderRenaming(null); }}
                  onClick={(e) => e.stopPropagation()} />
              ) : <span className="folder-name">{folder.name}</span>}
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
    const handleMouseMove = (e: MouseEvent) => setSidebarWidth(startWidth + e.clientX - startX);
    const handleMouseUp = () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [sidebarWidth, setSidebarWidth]);

  useEffect(() => { const h = () => setContextMenu(null); document.addEventListener('click', h); return () => document.removeEventListener('click', h); }, []);
  useEffect(() => { if (sidebarCollapsed) setExpandedFolders(new Set()); }, [sidebarCollapsed]);

  if (sidebarCollapsed) {
    return (
      <div className="sidebar sidebar-collapsed">
        <div className="sidebar-collapsed-top">
          <button className="sidebar-icon-btn" onClick={() => setShowSettings(true)} title="设置"><Settings size={18} /></button>
          <button className="sidebar-icon-btn" onClick={toggleSidebarCollapsed} title="展开"><PanelRightOpen size={18} /></button>
        </div>
        <div className="sidebar-collapsed-nav">
          <button className="sidebar-icon-btn" onClick={() => { setShowTrash(false); selectFolder(null); }} title="全部"><FileText size={18} /></button>
          <span className="sidebar-collapsed-separator" />
          {folders.filter(f => !f.parentId).map(f => (
            <button key={f.id} className="sidebar-icon-btn" onClick={() => { setShowTrash(false); selectFolder(f.id); }} title={f.name} style={{ color: f.color }}>
              <span className="folder-dot" style={{ background: f.color, width: 16, height: 16 }} />
            </button>
          ))}
          <span className="sidebar-collapsed-separator" />
          <button className="sidebar-icon-btn" onClick={() => setShowTrash(true)} title="回收站"><Trash2 size={18} /></button>
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
        <h1><BookMarked size={18} />VideoNote</h1>
        <div className="sidebar-actions">
          <button className="sidebar-icon-btn" onClick={() => setShowSettings(true)} title="设置"><Settings size={16} /></button>
          <button className="sidebar-icon-btn" onClick={toggleSidebarCollapsed} title="折叠"><PanelRightClose size={16} /></button>
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
          <span className="folder-count">{notes.filter(n => !n.deletedAt).length}</span>
        </div>
        {buildFolderTree(null)}
        <div className={`folder-item ${showTrash ? 'active' : ''}`} onClick={() => setShowTrash(true)}
          style={{ borderTop: '1px solid var(--border)', marginTop: 4 }}>
          <span className="folder-dot" style={{ background: 'var(--text-muted)' }} />
          <span className="folder-name">回收站</span>
          <span className="folder-count">{notes.filter(n => n.deletedAt).length}</span>
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="btn btn-secondary btn-sm" onClick={() => { if (showNewFolderInput && newFolderName.trim()) { createFolder(newFolderName.trim(), selectedFolderId); setNewFolderName(''); setShowNewFolderInput(false); } else { setShowNewFolderInput(true); setNewFolderName(''); } }} style={{ flex: 1 }}>
          <FolderPlus size={14} /> {showNewFolderInput ? '确认' : '新建文件夹'}</button>
        <button className="btn btn-primary btn-sm" onClick={() => createNote()} style={{ flex: 1 }}><Plus size={14} /> 新建笔记</button>
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
          const t = notes.filter(n => n.deletedAt);
          if (!t.length) return <div className="empty-state"><p>回收站为空</p></div>;
          return <><div className="note-list-header"><span>回收站</span>
            <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('确定清空？')) emptyTrash(); }}><Trash2 size={12} /> 清空</button></div>
            {t.sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime()).map(n => (
              <div key={n.id} className="note-item" style={n.color ? { borderLeftColor: n.color } : {}}>
                <div className="note-item-title"><span>{n.title || '未命名笔记'}</span></div>
                <div className="note-item-meta">
                  <span>删除于 {new Date(n.deletedAt!).toLocaleDateString('zh-CN')}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => restoreNote(n.id)}><RotateCcw size={12} /> 恢复</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm('永久删除？')) permanentlyDeleteNote(n.id); }}><Trash2 size={12} /> 永久删除</button>
                </div>
              </div>
            ))}</>;
        })() : selectedFolderId ? (() => {
          const f = notes.filter(n => n.folderId === selectedFolderId && !n.deletedAt);
          if (!f.length) return <div className="empty-state"><p>此文件夹暂无笔记</p></div>;
          return f.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(n => (
            <div key={n.id} className={`note-item ${selectedNoteId === n.id ? 'active' : ''}`}
              style={n.color ? { borderLeftColor: n.color } : {}} onClick={() => selectNote(n.id)}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, noteId: n.id }); }}>
              <div className="note-item-title">{n.pinned && <Pin size={12} className="pin-icon" />}<span>{n.title || '未命名笔记'}</span></div>
              <div className="note-item-preview">{n.content.replace(/[#*`>\[\]()_~]/g, '').substring(0, 80) || '空笔记'}</div>
              <div className="note-item-meta"><span>{new Date(n.updatedAt).toLocaleDateString('zh-CN')}</span>
                {(n.wordCount ?? 0) > 0 && <span>{n.wordCount} 字</span>}
                {n.videoInfo && <span className="note-item-video-badge">Bilibili</span>}
              </div>
            </div>
          ));
        })() : searchQuery ? (
          filteredNotes.length ? filteredNotes.map(n => (
            <div key={n.id} className={`note-item ${selectedNoteId === n.id ? 'active' : ''}`}
              style={n.color ? { borderLeftColor: n.color } : {}} onClick={() => selectNote(n.id)}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, noteId: n.id }); }}>
              <div className="note-item-title">{n.pinned && <Pin size={12} className="pin-icon" />}<span>{n.title || '未命名笔记'}</span></div>
              <div className="note-item-preview">{n.content.replace(/[#*`>\[\]()_~]/g, '').substring(0, 80) || '空笔记'}</div>
              <div className="note-item-meta"><span>{new Date(n.updatedAt).toLocaleDateString('zh-CN')}</span>
                {(n.wordCount ?? 0) > 0 && <span>{n.wordCount} 字</span>}
                {n.videoInfo && <span className="note-item-video-badge">Bilibili</span>}
              </div>
            </div>
          )) : <div className="empty-state"><p>未找到</p></div>
        ) : (
          <>
            {notes.filter(n => !n.folderId && !n.deletedAt).length > 0 && (
              <div className="note-list-group"><div className="note-list-group-header">未分类</div>
                {notes.filter(n => !n.folderId && !n.deletedAt).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(n => (
                  <div key={n.id} className={`note-item ${selectedNoteId === n.id ? 'active' : ''}`}
                    style={n.color ? { borderLeftColor: n.color } : {}} onClick={() => selectNote(n.id)}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, noteId: n.id }); }}>
                    <div className="note-item-title"><span>{n.title || '未命名笔记'}</span></div>
                    <div className="note-item-preview">{n.content.replace(/[#*`>\[\]()_~]/g, '').substring(0, 80) || '空笔记'}</div>
                    <div className="note-item-meta"><span>{new Date(n.updatedAt).toLocaleDateString('zh-CN')}</span></div>
                  </div>
                ))}
              </div>
            )}
            {folders.filter(f => !f.parentId).map(folder => {
              const fn = notes.filter(n => n.folderId === folder.id && !n.deletedAt);
              if (!fn.length) return null;
              return (
                <div key={folder.id} className="note-list-group">
                  <div className="note-list-group-header" style={{ borderLeftColor: folder.color }} onClick={() => selectFolder(folder.id)}>
                    <span className="folder-dot" style={{ background: folder.color, width: 6, height: 6 }} />
                    <span>{folder.name}</span> <span className="folder-count">{fn.length}</span>
                  </div>
                  {fn.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5).map(n => (
                    <div key={n.id} className={`note-item ${selectedNoteId === n.id ? 'active' : ''}`}
                      style={n.color ? { borderLeftColor: n.color } : {}} onClick={() => selectNote(n.id)}
                      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, noteId: n.id }); }}>
                      <div className="note-item-title">{n.pinned && <Pin size={12} className="pin-icon" />}<span>{n.title || '未命名笔记'}</span></div>
                      <div className="note-item-preview">{n.content.replace(/[#*`>\[\]()_~]/g, '').substring(0, 80) || '空笔记'}</div>
                      <div className="note-item-meta"><span>{new Date(n.updatedAt).toLocaleDateString('zh-CN')}</span></div>
                    </div>
                  ))}
                  {fn.length > 5 && <div className="note-list-group-more" onClick={() => selectFolder(folder.id)}>查看全部 {fn.length} 篇 {">"}</div>}
                </div>
              );
            })}
            {!folders.filter(f => !f.parentId).length && !notes.filter(n => !n.folderId && !n.deletedAt).length && (
              <div className="empty-state"><p>暂无笔记</p></div>
            )}
          </>
        )}
      </div>

      <div className="sidebar-resize-handle" onMouseDown={handleMouseDown} />

      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          {contextMenu.noteId && (<>
            <div className="context-menu-item" onClick={() => { togglePinNote(contextMenu.noteId!); setContextMenu(null); }}><Pin size={14} /> 置顶/取消置顶</div>
            <div className="context-menu-item" onClick={() => { duplicateNote(contextMenu.noteId!); setContextMenu(null); }}><Copy size={14} /> 复制笔记</div>
            <div className="context-menu-item" onClick={() => { setShowMoveNoteDialog(contextMenu.noteId!); setContextMenu(null); }}><FolderOpen size={14} /> 移动到文件夹</div>
            <div className="context-menu-item" onClick={() => { setShowNoteColorPicker(contextMenu.noteId!); setContextMenu(null); }}><Palette size={14} /> 调整配色</div>
            <div className="context-menu-divider" />
            <div className="context-menu-item danger" onClick={() => { deleteNote(contextMenu.noteId!); setContextMenu(null); }}><Trash2 size={14} /> 删除</div>
          </>)}
          {contextMenu.folderId && (<>
            <div className="context-menu-item" onClick={() => { setFolderRenaming(contextMenu.folderId!); setRenameValue(folders.find(f => f.id === contextMenu.folderId!)?.name || ''); setContextMenu(null); }}><Edit2 size={14} /> 重命名</div>
            <div className="context-menu-item" onClick={() => { createFolder('新建子文件夹', contextMenu.folderId); setContextMenu(null); }}><FolderPlus size={14} /> 新建子文件夹</div>
            <div className="context-menu-item" onClick={() => { setShowMoveFolderDialog(contextMenu.folderId!); setContextMenu(null); }}><FolderOpen size={14} /> 移动到...</div>
            <div className="context-menu-item" onClick={() => { setShowFolderColorPicker(contextMenu.folderId!); setContextMenu(null); }}><Palette size={14} /> 更改配色</div>
            <div className="context-menu-divider" />
            <div className="context-menu-item danger" onClick={() => { deleteFolder(contextMenu.folderId!); setContextMenu(null); }}><Trash2 size={14} /> 删除</div>
          </>)}
        </div>
      )}

      {showNoteColorPicker && (
        <div className="modal-overlay" onClick={() => setShowNoteColorPicker(null)}>
          <div className="modal" style={{ maxWidth: 350 }} onClick={(e) => e.stopPropagation()}>
            <h2>选择笔记颜色</h2>
            <div className="color-picker" style={{ justifyContent: 'center', marginBottom: 12 }}>
              {NOTE_COLORS.map(c => (
                <span key={c.value} className={`color-option ${(notes.find(n => n.id === showNoteColorPicker)?.color || '') === c.value ? 'selected' : ''}`}
                  style={c.value ? { background: c.value, width: 32, height: 32 } : { background: 'var(--bg-tertiary)', border: '1px dashed var(--text-muted)', width: 32, height: 32 }}
                  onClick={() => { setNoteColor(showNoteColorPicker!, c.value); showNoteColorPicker && setNoteColor(showNoteColorPicker, c.value); }} />
              ))}
            </div>
            <div className="color-input-wrapper" style={{ justifyContent: 'center' }}>
              <label>自定义</label>
              <input type="color" className="accent-color-input" value={notes.find(n => n.id === showNoteColorPicker)?.color || '#6c5ce7'}
                onChange={(e) => { setNoteColor(showNoteColorPicker!, e.target.value); }} />
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowNoteColorPicker(null)}>关闭</button></div>
          </div>
        </div>
      )}

      {showFolderColorPicker && (
        <div className="modal-overlay" onClick={() => setShowFolderColorPicker(null)}>
          <div className="modal" style={{ maxWidth: 350 }} onClick={(e) => e.stopPropagation()}>
            <h2>选择文件夹颜色</h2>
            <div className="color-picker" style={{ justifyContent: 'center', marginBottom: 12 }}>
              {FOLDER_COLORS.map(c => (
                <span key={c} className={`color-option ${(folders.find(f => f.id === showFolderColorPicker)?.color || '') === c ? 'selected' : ''}`}
                  style={{ background: c, width: 32, height: 32 }}
                  onClick={() => { updateFolder(showFolderColorPicker!, { color: c }); }} />
              ))}
            </div>
            <div className="color-input-wrapper" style={{ justifyContent: 'center' }}>
              <label>自定义</label>
              <input type="color" className="accent-color-input" value={folders.find(f => f.id === showFolderColorPicker)?.color || '#6c5ce7'}
                onChange={(e) => { updateFolder(showFolderColorPicker!, { color: e.target.value }); }} />
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowFolderColorPicker(null)}>关闭</button></div>
          </div>
        </div>
      )}

      {showMoveNoteDialog && (
        <div className="modal-overlay" onClick={() => setShowMoveNoteDialog(null)}>
          <div className="modal" style={{ maxWidth: 350 }} onClick={(e) => e.stopPropagation()}>
            <h2>移动到文件夹</h2>
            <div className="move-list">
              <button className="move-item" onClick={() => { const id = showMoveNoteDialog; setShowMoveNoteDialog(null); setTimeout(() => updateNote(id, { folderId: null })); }}><FileText size={14} /> （不分类）</button>
              {folders.map(f => (
                <button key={f.id} className="move-item" onClick={() => { const id = showMoveNoteDialog; setShowMoveNoteDialog(null); setTimeout(() => updateNote(id, { folderId: f.id })); }}>
                  <span className="folder-dot" style={{ background: f.color }} /> {f.name}</button>
              ))}
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowMoveNoteDialog(null)}>取消</button></div>
          </div>
        </div>
      )}

      {showMoveFolderDialog && (
        <div className="modal-overlay" onClick={() => setShowMoveFolderDialog(null)}>
          <div className="modal" style={{ maxWidth: 350 }} onClick={(e) => e.stopPropagation()}>
            <h2>移动文件夹到...</h2>
            <div className="move-list">
              <button className="move-item" onClick={() => { const id = showMoveFolderDialog; setShowMoveFolderDialog(null); updateFolder(id, { parentId: null }); }}><FileText size={14} /> （顶级目录）</button>
              {folders.filter(f => f.id !== showMoveFolderDialog).map(f => (
                <button key={f.id} className="move-item" onClick={() => { const id = showMoveFolderDialog; setShowMoveFolderDialog(null); updateFolder(id, { parentId: f.id }); }}>
                  <span className="folder-dot" style={{ background: f.color }} /> {f.name}</button>
              ))}
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowMoveFolderDialog(null)}>取消</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
