import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { FileText, Pin, Folder as FolderIcon, ChevronRight } from 'lucide-react';

function CoverImg({ src, alt }: { src: string; alt: string }) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    const api = window.electronAPI;
    if (api) {
      api.fetchCoverAsDataUrl(src)
        .then((dataUrl) => { if (dataUrl) setResolvedSrc(dataUrl); else setResolvedSrc(src); })
        .catch(() => setResolvedSrc(src));
    } else {
      // Web mode: use CORS proxy
      setResolvedSrc(`https://corsproxy.io/?url=${encodeURIComponent(src)}`);
    }
  }, [src]);

  if (!resolvedSrc) return null;
  return (
    <img src={resolvedSrc} alt={alt}
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
  );
}

function NoteOverview() {
  const { notes, folders, selectNote, selectFolder, selectedFolderId, settings } = useStore();
  const filteredNotes = useStore((s) => s.getFilteredNotes());

  const getFolderName = (folderId: string | null) => {
    if (!folderId) return null;
    const f = folders.find((f) => f.id === folderId);
    return f ? f.name : null;
  };

  // When a folder is selected: show notes in that folder as cards
  const UNCATEGORIZED_ID = '__uncategorized__';
  if (selectedFolderId) {
    // Show notes inside this folder
    const folder = folders.find(f => f.id === selectedFolderId);
    const isUncategorized = selectedFolderId === UNCATEGORIZED_ID;
    const displayName = isUncategorized ? '未分类笔记' : (folder?.name || '笔记');
    const displayNotes = isUncategorized
      ? notes.filter(n => !n.folderId)
      : filteredNotes;
    return (
      <div className="note-overview">
        <div className="note-overview-header">
          <h2>{displayName}</h2>
          <p>{displayNotes.length} 篇笔记</p>
        </div>

        {displayNotes.length === 0 ? (
          <div className="note-overview-empty">
            <FileText size={64} />
            <p>此文件夹暂无笔记</p>
          </div>
        ) : (
          <div className="note-overview-grid">
            {displayNotes.map((note) => {
              const folderName = getFolderName(note.folderId);
              return (
                <div key={note.id} className="note-overview-card" onClick={() => selectNote(note.id)}>
                  {/* Color bar always first, before cover */}
                  {note.color && <div className="note-overview-card-color-bar" style={{ background: note.color }} />}
                  {settings.showVideoCoverInOverview && note.videoInfo?.cover && (
                    <div className="note-overview-card-cover">
                      <CoverImg src={note.videoInfo.cover} alt="cover" />
                    </div>
                  )}
                  <div className="note-overview-card-body">
                    <div className="note-overview-card-title">
                      {note.pinned && <Pin size={12} style={{ color: 'var(--warning)', flexShrink: 0 }} />}
                      {note.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: note.color, flexShrink: 0, display: 'inline-block' }} />}
                      <span>{note.title || '未命名笔记'}</span>
                    </div>
                    <div className="note-overview-card-preview">
                      {note.content.replace(/[#*`>\[\]()_~]/g, '').substring(0, 120) || '空笔记'}
                    </div>
                    <div className="note-overview-card-meta">
                      <span>{new Date(note.updatedAt).toLocaleDateString('zh-CN')}</span>
                      {(note.wordCount ?? 0) > 0 && <span>{note.wordCount} 字</span>}
                      {note.videoInfo && <span className="note-item-video-badge">Bilibili</span>}
                      {folderName && <span className="note-overview-card-folder-badge">{folderName}</span>}
                    </div>
                    {(note.tags?.length ?? 0) > 0 && (
                      <div className="note-overview-card-tags">
                        {(note.tags ?? []).slice(0, 4).map((t) => (
                          <span key={t} className="mini-tag">{t}</span>
                        ))}
                        {(note.tags ?? []).length > 4 && <span className="mini-tag">+{(note.tags ?? []).length - 4}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // "全部笔记" mode: show folders as cards, with uncategorized notes
  const rootFolders = folders.filter(f => !f.parentId);
  const uncategorizedNotes = notes.filter(n => !n.folderId);

  return (
    <div className="note-overview">
      <div className="note-overview-header">
        <h2>全部笔记</h2>
        <p>{notes.length} 篇笔记 · {folders.length} 个文件夹</p>
      </div>

      <div className="overview-folder-grid">
        {/* "所有笔记" card — loads the folder view showing all notes */}
        <div className="overview-folder-card overview-all-card" onClick={() => selectFolder(null)}>
          <div className="overview-folder-card-icon">
            <FileText size={28} />
          </div>
          <div className="overview-folder-card-info">
            <h3>所有笔记</h3>
            <p>{notes.length} 篇</p>
          </div>
        </div>

        {/* Individual folder cards */}
        {rootFolders.map(folder => {
          const subfolders = folders.filter(f => f.parentId === folder.id);
          const noteCount = notes.filter(n => n.folderId === folder.id).length;
          return (
            <div key={folder.id} className="overview-folder-card" onClick={() => selectFolder(folder.id)}>
              <div className="overview-folder-card-icon" style={{ color: folder.color }}>
                <FolderIcon size={28} />
              </div>
              <div className="overview-folder-card-info">
                <h3>{folder.name}</h3>
                <p>{noteCount} 篇笔记{subfolders.length > 0 ? ` · ${subfolders.length} 个子文件夹` : ''}</p>
              </div>
              <span className="overview-folder-card-arrow"><ChevronRight size={16} /></span>
            </div>
          );
        })}

        {/* Uncategorized section if there are uncategorized notes */}
        {uncategorizedNotes.length > 0 && (
          <div className="overview-folder-card" onClick={() => selectFolder(UNCATEGORIZED_ID)}>
            <div className="overview-folder-card-icon" style={{ color: 'var(--text-muted)' }}>
              <FileText size={28} />
            </div>
            <div className="overview-folder-card-info">
              <h3>未分类笔记</h3>
              <p>{uncategorizedNotes.length} 篇</p>
            </div>
          </div>
        )}
      </div>

      {/* Note cards below folders when a folder-like selection is made */}
      {uncategorizedNotes.length > 0 && (
        <>
          <div className="note-overview-header" style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>最近更新的笔记</h3>
          </div>
          <div className="note-overview-grid">
            {notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6).map((note) => {
              const folderName = getFolderName(note.folderId);
              return (
                <div key={note.id} className="note-overview-card" onClick={() => selectNote(note.id)}>
                  {note.color && <div className="note-overview-card-color-bar" style={{ background: note.color }} />}
                  {settings.showVideoCoverInOverview && note.videoInfo?.cover && (
                    <div className="note-overview-card-cover">
                      <CoverImg src={note.videoInfo.cover} alt="cover" />
                    </div>
                  )}
                  <div className="note-overview-card-body">
                    <div className="note-overview-card-title">
                      {note.pinned && <Pin size={12} style={{ color: 'var(--warning)', flexShrink: 0 }} />}
                      <span>{note.title || '未命名笔记'}</span>
                    </div>
                    <div className="note-overview-card-preview">
                      {note.content.replace(/[#*`>\[\]()_~]/g, '').substring(0, 80) || '空笔记'}
                    </div>
                    <div className="note-overview-card-meta">
                      <span>{new Date(note.updatedAt).toLocaleDateString('zh-CN')}</span>
                      {note.videoInfo && <span className="note-item-video-badge">Bilibili</span>}
                      {folderName && <span className="note-overview-card-folder-badge">{folderName}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default NoteOverview;