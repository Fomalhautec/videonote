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
  allTags: string[];

  // Init
  initialize: () => Promise<void>;

  // Notes
  createNote: (folderId?: string | null, videoInfo?: any) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  selectNote: (id: string | null) => void;
  togglePinNote: (id: string) => void;
  duplicateNote: (id: string) => void;
  addTag: (noteId: string, tag: string) => void;
  removeTag: (noteId: string, tag: string) => void;
  setNoteColor: (noteId: string, color: string) => void;

  // Folders
  createFolder: (name: string, parentId?: string | null, color?: string) => Folder;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  deleteFolder: (id: string) => void;
  selectFolder: (id: string | null) => void;

  // Search
  setSearchQuery: (query: string) => void;

  // Sidebar
  setSidebarWidth: (width: number) => void;
  toggleSidebarCollapsed: () => void;

  // Settings
  setShowSettings: (show: boolean) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  applyTheme: (settings: AppSettings) => void;

  // Persist
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

const FOLDER_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
  '#1abc9c', '#3498db', '#9b59b6', '#e84393',
];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export const useStore = create<AppState>((set, get) => ({
  notes: [],
  folders: [],
  selectedNoteId: null,
  selectedFolderId: null,
  searchQuery: '',
  isInitialized: false,
  sidebarWidth: 280,
  sidebarCollapsed: false,
  settings: DEFAULT_SETTINGS,
  showSettings: false,
  allTags: [],

  initialize: async () => {
    const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
    try {
      if (api) {
        const [notes, folders, settings] = await Promise.all([
          api.loadNotes(),
          api.loadFolders(),
          api.loadSettings(),
        ]);
        const merged = { ...DEFAULT_SETTINGS, ...settings };
        const migrated = (notes as any[]).map(n => ({ ...n, tags: Array.isArray(n.tags) ? n.tags : [], color: typeof n.color === "string" ? n.color : "", wordCount: typeof n.wordCount === "number" ? n.wordCount : 0 }));
        const tags = new Set<string>();
        notes.forEach((n: Note) => (n.tags || []).forEach((t: string) => tags.add(t)));
        set({ notes: migrated, folders, settings: merged, isInitialized: true, allTags: Array.from(tags) });
        get().applyTheme(merged);
        return;
      }
    } catch (e) {
      console.error('Failed to load via IPC:', e);
    }
    const notes = loadFromStorage<Note[]>('videonote-notes', []);
    const folders = loadFromStorage<Folder[]>('videonote-folders', []);
    const migrated = (notes as any[]).map(n => ({ ...n, tags: Array.isArray(n.tags) ? n.tags : [], color: typeof n.color === "string" ? n.color : "", wordCount: typeof n.wordCount === "number" ? n.wordCount : 0 }));
    const settings = { ...DEFAULT_SETTINGS, ...loadFromStorage<Partial<AppSettings>>('videonote-settings', {}) };
    const tags = new Set<string>();
    notes.forEach((n) => (n.tags || []).forEach((t) => tags.add(t)));
    set({ notes: migrated, folders, settings, isInitialized: true, allTags: Array.from(tags) });
    get().applyTheme(settings);
  },

  createNote: (folderId = null, videoInfo = null) => {
    const now = new Date().toISOString();
    const note: Note = {
      id: uuidv4(), title: '未命名笔记', content: '',
      folderId: folderId || get().selectedFolderId, videoInfo,
      createdAt: now, updatedAt: now, pinned: false,
      tags: [], color: '', wordCount: 0,
    };
    set((state) => ({ notes: [note, ...state.notes] }));
    set({ selectedNoteId: note.id });
    get().persistNotes();
    return note;
  },

  updateNote: (id, updates) => {
    const now = new Date().toISOString();
    set((state) => {
      const newNotes = state.notes.map((n) => {
        if (n.id !== id) return n;
        const merged = { ...n, ...updates, updatedAt: now };
        if (updates.content !== undefined) merged.wordCount = countWords(updates.content || '');
        return merged;
      });
      return { notes: newNotes };
    });
    get().persistNotes();
    get().refreshAllTags();
  },

  deleteNote: (id) => {
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
      selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
    }));
    get().persistNotes();
    get().refreshAllTags();
  },

  selectNote: (id) => set({ selectedNoteId: id }),

  togglePinNote: (id) => {
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n
      ),
    }));
    get().persistNotes();
  },

  duplicateNote: (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const now = new Date().toISOString();
    const duplicate: Note = { ...note, id: uuidv4(), title: note.title + ' (副本)', createdAt: now, updatedAt: now };
    set((state) => ({ notes: [duplicate, ...state.notes] }));
    set({ selectedNoteId: duplicate.id });
    get().persistNotes();
  },

  addTag: (noteId, tag) => {
    const tagTrimmed = tag.trim();
    if (!tagTrimmed) return;
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === noteId && !n.tags.includes(tagTrimmed)
          ? { ...n, tags: [...n.tags, tagTrimmed], updatedAt: new Date().toISOString() }
          : n
      ),
    }));
    get().persistNotes();
    get().refreshAllTags();
  },

  removeTag: (noteId, tag) => {
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === noteId ? { ...n, tags: n.tags.filter((t) => t !== tag), updatedAt: new Date().toISOString() } : n
      ),
    }));
    get().persistNotes();
    get().refreshAllTags();
  },

  setNoteColor: (noteId, color) => {
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === noteId ? { ...n, color, updatedAt: new Date().toISOString() } : n
      ),
    }));
    get().persistNotes();
  },

  createFolder: (name, parentId = null, color = FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)]) => {
    const folder: Folder = { id: uuidv4(), name, parentId, color, createdAt: new Date().toISOString() };
    set((state) => ({ folders: [...state.folders, folder] }));
    get().persistFolders();
    return folder;
  },

  updateFolder: (id, updates) => {
    set((state) => ({ folders: state.folders.map((f) => (f.id === id ? { ...f, ...updates } : f)) }));
    get().persistFolders();
  },

  deleteFolder: (id) => {
    const state = get();
    const subfolderIds = new Set<string>();
    const findSubfolders = (parentId: string) => {
      state.folders.forEach((f) => { if (f.parentId === parentId && !subfolderIds.has(f.id)) { subfolderIds.add(f.id); findSubfolders(f.id); } });
    };
    findSubfolders(id);
    const allIds = new Set([id, ...subfolderIds]);
    set({
      folders: state.folders.filter((f) => !allIds.has(f.id)),
      notes: state.notes.map((n) => allIds.has(n.folderId ?? '') ? { ...n, folderId: null } : n),
      selectedFolderId: state.selectedFolderId && allIds.has(state.selectedFolderId) ? null : state.selectedFolderId,
    });
    get().persistFolders();
    get().persistNotes();
  },

  selectFolder: (id) => { set({ selectedFolderId: id, selectedNoteId: null }); },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSidebarWidth: (width) => set({ sidebarWidth: Math.max(200, Math.min(500, width)) }),
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setShowSettings: (show) => set({ showSettings: show }),

  updateSettings: (updates) => {
    const newSettings = { ...get().settings, ...updates };
    set({ settings: newSettings });
    get().applyTheme(newSettings);
    get().persistSettings();
  },

  applyTheme: (settings: AppSettings) => {
    const root = document.documentElement;
    if (settings.theme === 'light') {
      root.style.setProperty('--bg-primary', '#f5f5fa');
      root.style.setProperty('--bg-secondary', '#ffffff');
      root.style.setProperty('--bg-tertiary', '#eeeef5');
      root.style.setProperty('--bg-card', '#f0f0f8');
      root.style.setProperty('--bg-hover', '#e8e8f0');
      root.style.setProperty('--bg-active', '#dddde8');
      root.style.setProperty('--text-primary', '#1a1a2e');
      root.style.setProperty('--text-secondary', '#555570');
      root.style.setProperty('--text-muted', '#8888a0');
      root.style.setProperty('--border', '#d0d0dd');
      root.style.setProperty('--border-light', '#c0c0d0');
    } else {
      root.style.setProperty('--bg-primary', '#0f0f1a');
      root.style.setProperty('--bg-secondary', '#1a1a2e');
      root.style.setProperty('--bg-tertiary', '#16213e');
      root.style.setProperty('--bg-card', '#1e1e36');
      root.style.setProperty('--bg-hover', '#252545');
      root.style.setProperty('--bg-active', '#2a2a50');
      root.style.setProperty('--text-primary', '#e8e8f0');
      root.style.setProperty('--text-secondary', '#a0a0b8');
      root.style.setProperty('--text-muted', '#6a6a82');
      root.style.setProperty('--border', '#2a2a45');
      root.style.setProperty('--border-light', '#35355a');
    }
    root.style.setProperty('--accent', settings.accentColor);
    root.style.setProperty('--accent-hover', settings.accentColor + 'cc');
    root.style.setProperty('--accent-light', settings.accentColor + '26');
  },

  persistNotes: async () => {
    const { notes } = get();
    const api = window.electronAPI;
    if (api) { await api.saveNotes(notes); }
    else { localStorage.setItem('videonote-notes', JSON.stringify(notes)); }
  },

  persistFolders: async () => {
    const { folders } = get();
    const api = window.electronAPI;
    if (api) { await api.saveFolders(folders); }
    else { localStorage.setItem('videonote-folders', JSON.stringify(folders)); }
  },

  persistSettings: async () => {
    const { settings } = get();
    const api = window.electronAPI;
    if (api) { await api.saveSettings(settings); }
    else { localStorage.setItem('videonote-settings', JSON.stringify(settings)); }
  },

  refreshAllTags: () => {
    const tags = new Set<string>();
    get().notes.forEach((n) => (n.tags || []).forEach((t) => tags.add(t)));
    set({ allTags: Array.from(tags).sort() });
  },

  getFilteredNotes: () => {
    const { notes, selectedFolderId, searchQuery } = get();
    let filtered = notes;

    if (selectedFolderId) {
      const folderIds = new Set<string>();
      const findSubfolders = (parentId: string) => {
        get().folders.forEach((f) => {
          if (f.parentId === parentId) { folderIds.add(f.id); findSubfolders(f.id); }
        });
      };
      folderIds.add(selectedFolderId);
      findSubfolders(selectedFolderId);
      filtered = filtered.filter((n) => n.folderId && folderIds.has(n.folderId));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          (n.title || '').toLowerCase().includes(q) ||
          (n.content || '').toLowerCase().includes(q) ||
          (n.videoInfo?.title || '').toLowerCase().includes(q) ||
          (Array.isArray(n.tags) ? n.tags : []).some((t) => (t || '').toLowerCase().includes(q))
      );
    }

    return filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  },
}));