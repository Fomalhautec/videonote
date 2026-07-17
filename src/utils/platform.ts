export function isElectron(): boolean {
  return !!(window.electronAPI);
}

export function isCapacitor(): boolean {
  return !!((window as any).Capacitor);
}

export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  // Electron: use IPC proxy to download image and return data URL
  if (window.electronAPI) {
    return window.electronAPI.fetchCoverAsDataUrl(url);
  }
  // Web / Capacitor: return the URL directly with referrerpolicy on img tag
  // Bilibili CDN serves images to img tags without CORS issues
  return url;
}

export async function saveFileViaCapacitor(content: string | Blob, defaultName: string) {
  let base64Data: string;

  if (typeof content === 'string') {
    base64Data = btoa(unescape(encodeURIComponent(content)));
  } else {
    const reader = new FileReader();
    base64Data = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(content);
    });
  }

  try {
    // First try: write to Documents and open Share
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    await Filesystem.writeFile({
      path: defaultName,
      data: base64Data,
      directory: Directory.Documents,
    });

    const fileUri = await Filesystem.getUri({
      path: defaultName,
      directory: Directory.Documents,
    });

    await Share.share({
      title: defaultName,
      files: [fileUri.uri],
      dialogTitle: '保存或分享笔记',
    });
  } catch {
    // Fallback: browser download (works on emulator too)
    const blob = typeof content === 'string' ? new Blob([content]) : (content as Blob);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
