import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { FileText, Pin, Folder as FolderIcon, ChevronRight, Trash2, Palette, FileDown, Copy } from 'lucide-react';
import ExportDialog from '../Export/ExportDialog';

function CoverImg({ src, alt }: { src: string; alt: string }) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!src) return;
    const api = window.electronAPI;
    if (api) { api.fetchCoverAsDataUrl(src).then((d) => { if (d) setResolvedSrc(d); else setResolvedSrc(src); }).catch(() => setResolvedSrc(src)); }
    else { setResolvedSrc(`https://corsproxy.io/?url=${encodeURIComponent(src)}`); }
  }, [src]);
  if (!resolvedSrc) return null;
  return <img src={resolvedSrc} alt={alt} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
}

const NOTE_COLORS = [
  { value: '', label: '无' }, { value: '#e74c3c', label: '红' }, { value: '#e67e22', label: '橙' },
  { value: '#f1c40f', label: '黄' }, { value: '#2ecc71', label: '绿' }, { value: '#1abc9c', label: '青' },
  { value: '#3498db', label: '蓝' }, { value: '#9b59b6', label: '紫' }, { value: '#e84393', label: '粉' },
  { value: '#6c5ce7', label: '紫罗兰' }, { value: '#fd79a8', label: '浅粉' },
];

function NoteOverview() {
  const { notes, folders, selectNote, selectFolder, selectedFolderId, settings, updateNote, deleteNote, togglePinNote, duplicateNote, setNoteColor, updateFolder, deleteFolder } = useStore();
  const filteredNotes = useStore((s) => s.getFilteredNotes());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; noteId?: string; folderId?: string } | null>(null);
  const [showNoteColor, setShowNoteColor] = useState<string | null>(null);
  const [showFolderColor, setShowFolderColor] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const ctxNoteId = useRef<string | null>(null);

  useEffect(() => { const h = () => setContextMenu(null); document.addEventListener('click', h); return () => document.removeEventListener('click', h); }, []);

  const getFolderName = (folderId: string | null) => { if (!folderId) return null; const f = folders.find(f => f.id === folderId); return f ? f.name : null; };
  const nc = (id: string | null) => id ? notes.find(n => n.id === id)?.color || '' : '';
  const fc = (id: string | null) => id ? folders.find(f => f.id === id)?.color || '#6c5ce7' : '#6c5ce7';

  const UNCATEGORIZED_ID = '__uncategorized__';

  const renderContent = () => {
    if (selectedFolderId) {
      const folder = folders.find(f => f.id === selectedFolderId);
      const isUncategorized = selectedFolderId === UNCATEGORIZED_ID;
      const displayName = isUncategorized ? '未分类笔记' : (folder?.name || '笔记');
      const displayNotes = isUncategorized ? notes.filter(n => !n.folderId && !n.deletedAt) : filteredNotes;
      return (
        <div className="note-overview">
          <div className="note-overview-header"><h2>{displayName}</h2><p>{displayNotes.length} 篇笔记</p></div>
          {displayNotes.length === 0 ? (
            <div className="note-overview-empty"><FileText size={64} /><p>此文件夹暂无笔记</p></div>
          ) : (
            <div className="note-overview-grid">
              {displayNotes.map(note => (
                <div key={note.id} className="note-overview-card"
                  onClick={() => selectNote(note.id)}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, noteId: note.id }); }}>
                  {note.color && <div className="note-overview-card-color-bar" style={{ background: note.color }} />}
                  {settings.showVideoCoverInOverview && note.videoInfo?.cover && (
                    <div className="note-overview-card-cover"><CoverImg src={note.videoInfo.cover} alt="cover" /></div>
                  )}
                  <div className="note-overview-card-body">
                    <div className="note-overview-card-title">
                      {note.pinned && <Pin size={12} style={{ color: 'var(--warning)', flexShrink: 0 }} />}
                      {note.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: note.color, flexShrink: 0, display: 'inline-block' }} />}
                      <span>{note.title || '未命名笔记'}</span>
                    </div>
                    <div className="note-overview-card-preview">{note.content.replace(/[#*`>\[\]()_~]/g, '').substring(0, 120) || '空笔记'}</div>
                    <div className="note-overview-card-meta">
                      <span>{new Date(note.updatedAt).toLocaleDateString('zh-CN')}</span>
                      {(note.wordCount ?? 0) > 0 && <span>{note.wordCount} 字</span>}
                      {note.videoInfo && <span className="note-item-video-badge">Bilibili</span>}
                      {getFolderName(note.folderId) && <span className="note-overview-card-folder-badge">{getFolderName(note.folderId)}</span>}
                    </div>
                    {(note.tags?.length ?? 0) > 0 && (
                      <div className="note-overview-card-tags">
                        {(note.tags ?? []).slice(0, 4).map(t => <span key={t} className="mini-tag">{t}</span>)}
                        {(note.tags ?? []).length > 4 && <span className="mini-tag">+{(note.tags ?? []).length - 4}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    const rootFolders = folders.filter(f => !f.parentId);
    const uncategorizedNotes = notes.filter(n => !n.folderId && !n.deletedAt);
    return (
      <div className="note-overview">
        <div className="note-overview-header"><h2>全部笔记</h2><p>{notes.filter(n => !n.deletedAt).length} 篇笔记 · {folders.length} 个文件夹</p></div>
        <div className="overview-folder-grid">
          <div className="overview-folder-card overview-all-card" onClick={() => selectFolder(null)}>
            <div className="overview-folder-card-icon"><FileText size={28} /></div>
            <div className="overview-folder-card-info"><h3>所有笔记</h3><p>{notes.filter(n => !n.deletedAt).length} 篇</p></div>
          </div>
          {rootFolders.map(folder => {
            const sfolders = folders.filter(f => f.parentId === folder.id);
            const ncount = notes.filter(n => n.folderId === folder.id && !n.deletedAt).length;
            return (
              <div key={folder.id} className="overview-folder-card" onClick={() => selectFolder(folder.id)}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, folderId: folder.id }); }}>
                <div className="overview-folder-card-icon" style={{ color: folder.color }}><FolderIcon size={28} /></div>
                <div className="overview-folder-card-info"><h3>{folder.name}</h3><p>{ncount} 篇{sfolders.length > 0 ? ` · ${sfolders.length} 子文件夹` : ''}</p></div>
                <span className="overview-folder-card-arrow"><ChevronRight size={16} /></span>
              </div>
            );
          })}
          {uncategorizedNotes.length > 0 && (
            <div className="overview-folder-card" onClick={() => selectFolder(UNCATEGORIZED_ID)}>
              <div className="overview-folder-card-icon" style={{ color: 'var(--text-muted)' }}><FileText size={28} /></div>
              <div className="overview-folder-card-info"><h3>未分类笔记</h3><p>{uncategorizedNotes.length} 篇</p></div>
            </div>
          )}
        </div>
        {uncategorizedNotes.length > 0 && (
          <div className="note-overview-header" style={{ marginTop: 24 }}><h3 style={{ fontSize: 16, fontWeight: 600 }}>最近更新的笔记</h3></div>
        )}
        {uncategorizedNotes.length > 0 && (
          <div className="note-overview-grid">
            {notes.filter(n => !n.deletedAt).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6).map(note => (
              <div key={note.id} className="note-overview-card"
                onClick={() => selectNote(note.id)}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, noteId: note.id }); }}>
                {note.color && <div className="note-overview-card-color-bar" style={{ background: note.color }} />}
                {settings.showVideoCoverInOverview && note.videoInfo?.cover && (
                  <div className="note-overview-card-cover"><CoverImg src={note.videoInfo.cover} alt="cover" /></div>
                )}
                <div className="note-overview-card-body">
                  <div className="note-overview-card-title">{note.pinned && <Pin size={12} style={{ color: 'var(--warning)', flexShrink: 0 }} />}<span>{note.title || '未命名笔记'}</span></div>
                  <div className="note-overview-card-preview">{note.content.replace(/[#*`>\[\]()_~]/g, '').substring(0, 80) || '空笔记'}</div>
                  <div className="note-overview-card-meta">
                    <span>{new Date(note.updatedAt).toLocaleDateString('zh-CN')}</span>
                    {note.videoInfo && <span className="note-item-video-badge">Bilibili</span>}
                    {getFolderName(note.folderId) && <span className="note-overview-card-folder-badge">{getFolderName(note.folderId)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>{renderContent()}

      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          {contextMenu.noteId && (<>
            <div className="context-menu-item" onClick={() => { togglePinNote(contextMenu.noteId!); setContextMenu(null); }}><Pin size={14} /> 置顶/取消置顶</div>
            <div className="context-menu-item" onClick={() => { duplicateNote(contextMenu.noteId!); setContextMenu(null); }}><Copy size={14} /> 复制笔记</div>
            <div className="context-menu-item" onClick={() => { setShowNoteColor(contextMenu.noteId!); setContextMenu(null); }}><Palette size={14} /> 调整配色</div>
            <div className="context-menu-item" onClick={() => { ctxNoteId.current = contextMenu.noteId!; setShowExport(true); setContextMenu(null); }}><FileDown size={14} /> 导出</div>
            <div className="context-menu-divider" />
            <div className="context-menu-item danger" onClick={() => { deleteNote(contextMenu.noteId!); setContextMenu(null); }}><Trash2 size={14} /> 删除</div>
          </>)}
          {contextMenu.folderId && (<>
            <div className="context-menu-item" onClick={() => { setShowFolderColor(contextMenu.folderId!); setContextMenu(null); }}><Palette size={14} /> 更改配色</div>
            <div className="context-menu-divider" />
            <div className="context-menu-item danger" onClick={() => { deleteFolder(contextMenu.folderId!); setContextMenu(null); }}><Trash2 size={14} /> 删除</div>
          </>)}
        </div>
      )}

      {showNoteColor && (
        <div className="modal-overlay" onClick={() => setShowNoteColor(null)}>
          <div className="modal" style={{ maxWidth: 350 }} onClick={(e) => e.stopPropagation()}>
            <h2>选择笔记颜色</h2>
            <div className="color-picker" style={{ justifyContent: 'center', marginBottom: 12 }}>
              {NOTE_COLORS.map(c => (
                <span key={c.value} className={`color-option ${nc(showNoteColor) === c.value ? 'selected' : ''}`}
                  style={c.value ? { background: c.value, width: 32, height: 32 } : { background: 'var(--bg-tertiary)', border: '1px dashed var(--text-muted)', width: 32, height: 32 }}
                  onClick={() => { setNoteColor(showNoteColor!, c.value); }} />
              ))}
            </div>
            <div className="color-input-wrapper" style={{ justifyContent: 'center' }}>
              <label>自定义</label>
              <input type="color" className="accent-color-input" value={nc(showNoteColor) || '#6c5ce7'}
                onChange={(e) => { setNoteColor(showNoteColor!, e.target.value); }} />
            </div>
               <div className="modal-footer" style={{ marginTop: 8 }}><button className="btn btn-secondary" onClick={() => setShowFolderColor(null)}>关闭</button></div>
          </div>
        </div>
      )}

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </>
  );
}

export default NoteOverview;
