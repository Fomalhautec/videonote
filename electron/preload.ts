import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  loadNotes: () => ipcRenderer.invoke('notes:load'),
  saveNotes: (notes: any[]) => ipcRenderer.invoke('notes:save', notes),
  loadFolders: () => ipcRenderer.invoke('folders:load'),
  saveFolders: (folders: any[]) => ipcRenderer.invoke('folders:save', folders),
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings: any) => ipcRenderer.invoke('settings:save', settings),
  fetchVideoInfo: (bvid: string) => ipcRenderer.invoke('bilibili:fetch', bvid),
  fetchVideoInfoFromUrl: (url: string) => ipcRenderer.invoke('bilibili:fetch-url', url),
  fetchCoverAsDataUrl: (url: string) => ipcRenderer.invoke('bilibili:cover-proxy', url),
  openExternal: (url: string) => ipcRenderer.invoke('shell:open', url),
  showSaveDialog: (options: any) => ipcRenderer.invoke('export:save-dialog', options),
  writeFile: (filePath: string, data: string) => ipcRenderer.invoke('export:write-file', filePath, data),
  exportDocx: (data: { title: string; content: string; filePath: string }) => ipcRenderer.invoke('export:docx', data),
  selectImage: () => ipcRenderer.invoke('file:select-image'),
  selectStorageDir: () => ipcRenderer.invoke('storage:select-dir'),
  changeStoragePath: (newPath: string) => ipcRenderer.invoke('storage:change-path', newPath),
});
