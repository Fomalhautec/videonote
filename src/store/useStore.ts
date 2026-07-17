import { create } from 'zustand';
import { Note, Folder, AppSettings, DEFAULT_SETTINGS } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  notes: Note[];
  folders: Folder[];
  selectedNoteId: string | null;
  selectedFolderId: string | null;
  searchQuery: string;
  isInitialized: boolean;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  settings: AppSettings;
  showSettings: boolean;
  showTrash: boolean;
  allTags: string[];
  setShowTrash: (show: boolean) => void;
  permanentlyDeleteNote: (id: string) => void;
  restoreNote: (id: string) => void;
  emptyTrash: () => void;
  getTrashedNotes: () => Note[];
  cleanupTrash: () => void;
  initialize: () => Promise<void>;
  createNote: (folderId?: string | null, videoInfo?: any) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  selectNote: (id: string | null) => void;
  togglePinNote: (id: string) => void;
  duplicateNote: (id: string) => void;
  addTag: (noteId: string, tag: string) => void;
  removeTag: (noteId: string, tag: string) => void;
  setNoteColor: (noteId: string, color: string) => void;
  createFolder: (name: string, parentId?: string | null, color?: string) => Folder;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  selectFolder: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebarCollapsed: () => void;
  setShowSettings: (show: boolean) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  applyTheme: (settings: AppSettings) => void;
  persistNotes: () => Promise<void>;
  persistFolders: () => Promise<void>;
  persistSettings: () => Promise<void>;
  getFilteredNotes: () => Note[];
  refreshAllTags: () => void;
}

function countWords(text: string): number {
  const clean = text.replace(/[#*`>\[\]()_~]/g, '').trim();
  if (!clean) return 0;
  const chineseChars = (clean.match(/[一-鿿]/g) || []).length;
  const otherWords = clean.replace(/[一-鿿]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return chineseChars + otherWords;
}

const FOLDER_COLORS = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db','#9b59b6','#e84393'];

function loadFromStorage<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}

export const useStore = create<AppState>((set, get) => ({
  notes: [], folders: [], selectedNoteId: null, selectedFolderId: null,
  searchQuery: '', isInitialized: false, sidebarWidth: 280, sidebarCollapsed: false,
  settings: DEFAULT_SETTINGS, showSettings: false, showTrash: false, allTags: [],

  initialize: async () => {
    const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
    try {
      if (api) {
        const [notes, folders, settings] = await Promise.all([
          api.loadNotes(), api.loadFolders(), api.loadSettings(),
        ]);
        const m = { ...DEFAULT_SETTINGS, ...settings };
        const migrated = notes.map((n: any) => ({ ...n, tags: Array.isArray(n.tags) ? n.tags : [], color: typeof n.color === 'string' ? n.color : '', wordCount: typeof n.wordCount === 'number' ? n.wordCount : 0, deletedAt: n.deletedAt || null }));
        const t = new Set<string>();
        notes.forEach((n: Note) => (n.tags || []).forEach((tag: string) => t.add(tag)));
        get().cleanupTrash();
        set({ notes: migrated, folders, settings: m, isInitialized: true, allTags: Array.from(t) });
        get().applyTheme(m);
        return;
      }
    } catch (e) { console.error(e); }
    const notes = loadFromStorage<Note[]>('videonote-notes', []);
    const folders = loadFromStorage<Folder[]>('videonote-folders', []);
    const migrated = notes.map((n: any) => ({ ...n, tags: Array.isArray(n.tags) ? n.tags : [], color: typeof n.color === 'string' ? n.color : '', wordCount: typeof n.wordCount === 'number' ? n.wordCount : 0, deletedAt: n.deletedAt || null }));
    const s = { ...DEFAULT_SETTINGS, ...loadFromStorage<Partial<AppSettings>>('videonote-settings', {}) };
    const t = new Set<string>();
    notes.forEach((n: Note) => (n.tags || []).forEach((tag: string) => t.add(tag)));
    set({ notes: migrated, folders, settings: s, isInitialized: true, allTags: Array.from(t) });
    get().applyTheme(s);
  },

  createNote: (folderId = null, videoInfo = null) => {
    const now = new Date().toISOString();
    const note: Note = { id: uuidv4(), title: '未命名笔记', content: '', folderId: folderId || get().selectedFolderId, videoInfo, createdAt: now, updatedAt: now, pinned: false, tags: [], color: '', wordCount: 0, deletedAt: null };
    set((s) => ({ notes: [note, ...s.notes] }));
    set({ selectedNoteId: note.id });
    get().persistNotes();
    return note;
  },

  updateNote: (id, updates) => {
    const now = new Date().toISOString();
    set((s) => ({ notes: s.notes.map(n => n.id !== id ? n : { ...n, ...updates, updatedAt: now, wordCount: updates.content !== undefined ? countWords(updates.content || '') : n.wordCount }) }));
    get().persistNotes(); get().refreshAllTags();
  },

  deleteNote: (id) => {
    const now = new Date().toISOString();
    set((s) => ({ notes: s.notes.map(n => n.id === id ? { ...n, deletedAt: now, updatedAt: now } : n), selectedNoteId: s.selectedNoteId === id ? null : s.selectedNoteId }));
    get().persistNotes(); get().refreshAllTags();
  },

  permanentlyDeleteNote: (id) => { set((s) => ({ notes: s.notes.filter(n => n.id !== id) })); get().persistNotes(); get().refreshAllTags(); },
  restoreNote: (id) => { set((s) => ({ notes: s.notes.map(n => n.id === id ? { ...n, deletedAt: null, updatedAt: new Date().toISOString() } : n) })); get().persistNotes(); get().refreshAllTags(); },
  emptyTrash: () => { set((s) => ({ notes: s.notes.filter(n => !n.deletedAt) })); get().persistNotes(); get().refreshAllTags(); },
  getTrashedNotes: () => get().notes.filter(n => n.deletedAt !== null),
  cleanupTrash: () => { const d = Date.now() - 14 * 24 * 60 * 60 * 1000; set((s) => ({ notes: s.notes.filter(n => !n.deletedAt || new Date(n.deletedAt!).getTime() > d) })); get().persistNotes(); get().refreshAllTags(); },

  selectNote: (id) => set({ selectedNoteId: id }),
  togglePinNote: (id) => { set((s) => ({ notes: s.notes.map(n => n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n) })); get().persistNotes(); },
  duplicateNote: (id) => { const note = get().notes.find(n => n.id === id); if (!note) return; const now = new Date().toISOString(); const dup = { ...note, id: uuidv4(), title: note.title + ' (副本)', createdAt: now, updatedAt: now }; set((s) => ({ notes: [dup, ...s.notes] })); set({ selectedNoteId: dup.id }); get().persistNotes(); },
  addTag: (noteId, tag) => { const t = tag.trim(); if (!t) return; set((s) => ({ notes: s.notes.map(n => n.id === noteId && !n.tags.includes(t) ? { ...n, tags: [...n.tags, t], updatedAt: new Date().toISOString() } : n) })); get().persistNotes(); get().refreshAllTags(); },
  removeTag: (noteId, tag) => { set((s) => ({ notes: s.notes.map(n => n.id === noteId ? { ...n, tags: n.tags.filter(x => x !== tag), updatedAt: new Date().toISOString() } : n) })); get().persistNotes(); get().refreshAllTags(); },
  setNoteColor: (noteId, color) => { set((s) => ({ notes: s.notes.map(n => n.id === noteId ? { ...n, color, updatedAt: new Date().toISOString() } : n) })); get().persistNotes(); },

  createFolder: (name, parentId = null, color = FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)]) => { const f: Folder = { id: uuidv4(), name, parentId, color, createdAt: new Date().toISOString() }; set((s) => ({ folders: [...s.folders, f] })); get().persistFolders(); return f; },
  updateFolder: (id, updates) => { set((s) => ({ folders: s.folders.map(f => f.id === id ? { ...f, ...updates } : f) })); get().persistFolders(); },
  deleteFolder: (id) => { const s = get(); const ids = new Set<string>(); const find = (pid: string) => { s.folders.forEach(f => { if (f.parentId === pid && !ids.has(f.id)) { ids.add(f.id); find(f.id); } }); }; ids.add(id); find(id); set({ folders: s.folders.filter(f => !ids.has(f.id)), notes: s.notes.map(n => ids.has(n.folderId ?? '') ? { ...n, folderId: null } : n), selectedFolderId: s.selectedFolderId && ids.has(s.selectedFolderId) ? null : s.selectedFolderId }); get().persistFolders(); get().persistNotes(); },
  selectFolder: (id) => { set({ selectedFolderId: id, selectedNoteId: null }); },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setSidebarWidth: (w) => set({ sidebarWidth: Math.max(200, Math.min(500, w)) }),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowTrash: (show) => set({ showTrash: show, selectedFolderId: null, selectedNoteId: null }),

  updateSettings: (updates) => { const ns = { ...get().settings, ...updates }; set({ settings: ns }); get().applyTheme(ns); get().persistSettings(); },

  applyTheme: (settings: AppSettings) => {
    const r = document.documentElement;
    if (settings.theme === 'light') {
      r.style.setProperty('--bg-primary', '#f5f5fa'); r.style.setProperty('--bg-secondary', '#ffffff');
      r.style.setProperty('--bg-tertiary', '#eeeef5'); r.style.setProperty('--bg-card', '#f0f0f8');
      r.style.setProperty('--bg-hover', '#e8e8f0'); r.style.setProperty('--bg-active', '#dddde8');
      r.style.setProperty('--text-primary', '#1a1a2e'); r.style.setProperty('--text-secondary', '#555570');
      r.style.setProperty('--text-muted', '#8888a0'); r.style.setProperty('--border', '#d0d0dd');
      r.style.setProperty('--border-light', '#c0c0d0');
    } else {
      r.style.setProperty('--bg-primary', '#0f0f1a'); r.style.setProperty('--bg-secondary', '#1a1a2e');
      r.style.setProperty('--bg-tertiary', '#16213e'); r.style.setProperty('--bg-card', '#1e1e36');
      r.style.setProperty('--bg-hover', '#252545'); r.style.setProperty('--bg-active', '#2a2a50');
      r.style.setProperty('--text-primary', '#e8e8f0'); r.style.setProperty('--text-secondary', '#a0a0b8');
      r.style.setProperty('--text-muted', '#6a6a82'); r.style.setProperty('--border', '#2a2a45');
      r.style.setProperty('--border-light', '#35355a');
    }
    r.style.setProperty('--accent', settings.accentColor);
    r.style.setProperty('--accent-hover', settings.accentColor + 'cc');
    r.style.setProperty('--accent-light', settings.accentColor + '26');
  },

  persistNotes: async () => { const n = get().notes; if (window.electronAPI) await window.electronAPI.saveNotes(n); else localStorage.setItem('videonote-notes', JSON.stringify(n)); },
  persistFolders: async () => { const f = get().folders; if (window.electronAPI) await window.electronAPI.saveFolders(f); else localStorage.setItem('videonote-folders', JSON.stringify(f)); },
  persistSettings: async () => { const s = get().settings; if (window.electronAPI) await window.electronAPI.saveSettings(s); else localStorage.setItem('videonote-settings', JSON.stringify(s)); },

  refreshAllTags: () => { const t = new Set<string>(); get().notes.forEach(n => (n.tags || []).forEach(tag => t.add(tag))); set({ allTags: Array.from(t).sort() }); },

  getFilteredNotes: () => {
    const { notes, selectedFolderId, searchQuery } = get();
    let filtered = notes.filter(n => !n.deletedAt);
    if (selectedFolderId) {
      const ids = new Set<string>();
      const find = (pid: string) => { get().folders.forEach(f => { if (f.parentId === pid) { ids.add(f.id); find(f.id); } }); };
      ids.add(selectedFolderId); find(selectedFolderId);
      filtered = filtered.filter(n => n.folderId && ids.has(n.folderId));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.content || '').toLowerCase().includes(q) ||
        (n.videoInfo?.title || '').toLowerCase().includes(q) ||
        (n.tags || []).some(t => (t || '').toLowerCase().includes(q))
      );
    }
    return filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  },
}));
