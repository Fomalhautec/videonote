export function isElectron(): boolean {
  return !!(window.electronAPI);
}

export function isCapacitor(): boolean {
  return !!(window as any).Capacitor;
}

export async function saveFileViaCapacitor(content: string | Blob, defaultName: string) {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');

  let base64Data: string;
  let mimeType: string;

  if (typeof content === 'string') {
    base64Data = btoa(unescape(encodeURIComponent(content)));
    mimeType = 'text/plain;charset=utf-8';
  } else {
    const reader = new FileReader();
    base64Data = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(content);
    });
    mimeType = content.type || 'application/octet-stream';
  }

  try {
    // Try writing to the Downloads directory first
    await Filesystem.writeFile({
      path: defaultName,
      data: base64Data,
      directory: Directory.Documents,
    });

    // If successful, tell the user where it was saved and offer to share
    const { Share } = await import('@capacitor/share');
    try {
      await Share.share({
        title: '保存笔记',
        text: `笔记已导出为 ${defaultName}，保存在应用的 Documents 目录中。`,
        files: [],
        dialogTitle: '导出成功',
      });
    } catch {
      // User cancelled share dialog, that's ok
    }

    return true;
  } catch (e: any) {
    console.error('Capacitor file save failed:', e);
    // Fallback: try Share directly with file
    try {
      const { Share } = await import('@capacitor/share');

      // Write to cache directory first for sharing
      const tempPath = `videonote_export/${defaultName}`;
      await Filesystem.writeFile({
        path: tempPath,
        data: base64Data,
        directory: Directory.Cache,
      });

      const fileUri = await Filesystem.getUri({
        path: tempPath,
        directory: Directory.Cache,
      });

      await Share.share({
        title: defaultName,
        files: [fileUri.uri],
        dialogTitle: '分享或保存笔记',
      });
      return true;
    } catch (e2: any) {
      console.error('Share fallback also failed:', e2);
      throw new Error('保存失败: ' + (e2.message || e.message));
    }
  }
}
