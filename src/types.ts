export interface VideoInfo {
  bvid: string;
  title: string;
  cover: string;
  author: string;
  duration: number;
  description: string;
  url: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  videoInfo: VideoInfo | null;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  tags: string[];
  color: string;
  wordCount: number;
  deletedAt: string | null;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
  createdAt: string;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  sidebarWidth: number;
  storagePath: string;
  showVideoCoverInOverview: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: '#6c5ce7',
  sidebarWidth: 280,
  storagePath: '',
  showVideoCoverInOverview: true,
};

export interface ElectronAPI {
  loadNotes: () => Promise<Note[]>;
  saveNotes: (notes: Note[]) => Promise<boolean>;
  loadFolders: () => Promise<Folder[]>;
  saveFolders: (folders: Folder[]) => Promise<boolean>;
  loadSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<boolean>;
  fetchVideoInfo: (bvid: string) => Promise<VideoInfo>;
  fetchVideoInfoFromUrl: (url: string) => Promise<VideoInfo>;
  fetchCoverAsDataUrl: (url: string) => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string }>;
  writeFile: (filePath: string, data: string) => Promise<boolean>;
  exportDocx: (data: { title: string; content: string; filePath: string }) => Promise<boolean>;
  selectImage: () => Promise<string | null>;
  selectStorageDir: () => Promise<string | null>;
  changeStoragePath: (newPath: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
