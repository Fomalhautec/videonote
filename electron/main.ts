import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

let mainWindow: BrowserWindow | null = null;
let pdfWindow: BrowserWindow | null = null;

const DEFAULT_DATA_DIR = path.join(app.getPath('userData'), 'videonote-data');
let DATA_DIR = DEFAULT_DATA_DIR;

function getDataDir(): string {
  return DATA_DIR;
}

function resolveDataDir() {
  const settingsPath = path.join(DEFAULT_DATA_DIR, 'settings.json');
  try {
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      if (settings.storagePath && fs.existsSync(settings.storagePath)) {
        DATA_DIR = settings.storagePath;
      }
    }
  } catch (e) {
    console.error('Failed to resolve data dir from settings:', e);
  }
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getNotesPath() {
  return path.join(DATA_DIR, 'notes.json');
}

function getFoldersPath() {
  return path.join(DATA_DIR, 'folders.json');
}

function getSettingsPath() {
  return path.join(DATA_DIR, 'settings.json');
}

function loadJSON(filePath: string): any {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load JSON:', e);
  }
  return null;
}

function saveJSON(filePath: string, data: any) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function loadData(filePath: string): any[] {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  return [];
}

function saveData(filePath: string, data: any[]) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    frame: process.platform === 'darwin' ? false : true,
    backgroundColor: '#1a1a2e',
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  resolveDataDir();
  ensureDataDir();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ======== IPC Handlers ========

// Notes CRUD
ipcMain.handle('notes:load', async () => {
  return loadData(getNotesPath());
});

ipcMain.handle('notes:save', async (_event, notes: any[]) => {
  saveData(getNotesPath(), notes);
  return true;
});

// Folders CRUD
ipcMain.handle('folders:load', async () => {
  return loadData(getFoldersPath());
});

ipcMain.handle('folders:save', async (_event, folders: any[]) => {
  saveData(getFoldersPath(), folders);
  return true;
});

// Open external link
ipcMain.handle('shell:open', async (_event, url: string) => {
  await shell.openExternal(url);
});

// Fetch video info from Bilibili
ipcMain.handle('bilibili:fetch', async (_event, bvid: string) => {
  try {
    const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(data.message || 'API error');
    }
    return {
      title: data.data.title,
      cover: data.data.pic,
      bvid: data.data.bvid,
      author: data.data.owner?.name || '',
      duration: data.data.duration,
      description: data.data.desc || '',
    };
  } catch (e: any) {
    throw new Error(`Failed to fetch video info: ${e.message}`);
  }
});

ipcMain.handle('bilibili:fetch-url', async (_event, url: string) => {
  try {
    const bvidMatch = url.match(/BV[a-zA-Z0-9]+/);
    if (!bvidMatch) {
      throw new Error('Invalid Bilibili URL');
    }
    const bvid = bvidMatch[0];
    const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.code !== 0) throw new Error(data.message || 'API error');
    return {
      title: data.data.title,
      cover: data.data.pic,
      bvid: data.data.bvid,
      author: data.data.owner?.name || '',
      duration: data.data.duration,
      description: data.data.desc || '',
      url: url,
    };
  } catch (e: any) {
    throw new Error(`Failed to fetch: ${e.message}`);
  }
});

// Export file dialog
ipcMain.handle('export:save-dialog', async (_event, options: { defaultName: string; filters: { name: string; extensions: string[] }[] }) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: options.defaultName,
    filters: options.filters,
  });
  return result;
});

ipcMain.handle('export:write-file', async (_event, filePath: string, data: string) => {
  // If data is a base64 data URL, decode it for binary files
  if (data.startsWith('data:')) {
    const base64Data = data.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
  } else {
    fs.writeFileSync(filePath, data, 'utf-8');
  }
  return true;
});

// PDF Export — uses Electron's built-in Chromium printToPDF for perfect rendering
ipcMain.handle('export:pdf', async (_event, { title, content, filePath, videoInfo }: { title: string; content: string; filePath: string; videoInfo?: { title?: string; author?: string; bvid?: string; url?: string } }) => {
  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const mdToSimpleHtml = (text: string) => {
    let html = '';
    const lines = text.split('\n');
    let inUl = false, inOl = false;
    const flush = () => { if (inUl) { html += '</ul>\n'; inUl = false; } if (inOl) { html += '</ol>\n'; inOl = false; } };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('# ')) { flush(); html += '<h1>' + escapeHtml(line.slice(2)) + '</h1>\n'; }
      else if (line.startsWith('## ')) { flush(); html += '<h2>' + escapeHtml(line.slice(3)) + '</h2>\n'; }
      else if (line.startsWith('### ')) { flush(); html += '<h3>' + escapeHtml(line.slice(4)) + '</h3>\n'; }
      else if (line.startsWith('```')) { flush(); i++; let c = ''; while (i < lines.length && !lines[i].startsWith('```')) { c += escapeHtml(lines[i]) + '\n'; i++; } html += '<pre><code>' + c + '</code></pre>\n'; }
      else if (line.startsWith('> ')) { flush(); html += '<blockquote>' + escapeHtml(line.slice(2)) + '</blockquote>\n'; }
      else if (line.match(/^- /)) { if (inOl) { html += '</ol>\n'; inOl = false; } if (!inUl) { html += '<ul>\n'; inUl = true; } html += '<li>' + escapeHtml(line.replace(/^- /, '')) + '</li>\n'; }
      else if (line.match(/^\d+\. /)) { if (inUl) { html += '</ul>\n'; inUl = false; } if (!inOl) { html += '<ol>\n'; inOl = true; } html += '<li>' + escapeHtml(line.replace(/^\d+\. /, '')) + '</li>\n'; }
      else if (line.startsWith('---') || line.startsWith('***')) { flush(); html += '<hr>\n'; }
      else if (line.trim() === '') { flush(); }
      else { flush(); html += '<p>' + escapeHtml(line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>') + '</p>\n'; }
    }
    flush();
    return html;
  };

  try {
    const bodyHtml = mdToSimpleHtml(content.replace(/\[toc\]/gi, ''));
    let videoFooter = '';
    if (videoInfo?.title) {
      const parts = [`关联视频: ${escapeHtml(videoInfo.title)}`];
      if (videoInfo.author) parts.push(`UP主: ${escapeHtml(videoInfo.author)}`);
      if (videoInfo.bvid) parts.push(`BV号: ${videoInfo.bvid}`);
      if (videoInfo.url) parts.push(`链接: ${escapeHtml(videoInfo.url)}`);
      videoFooter = '<hr style="margin-top:16px;"><p style="font-size:11px;color:#888;">' + parts.join(' · ') + '</p>';
    }
    const styledHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Microsoft YaHei','PingFang SC','Noto Sans CJK SC','SimSun',sans-serif; padding:20px 24px; color:#333; line-height:1.8; font-size:13px; }
  h1 { font-size:20px; border-bottom:2px solid #6c5ce7; padding-bottom:6px; margin-bottom:12px; }
  h2 { font-size:17px; margin:14px 0 6px; } h3 { font-size:14px; margin:12px 0 4px; }
  p { margin:4px 0; }
  ul, ol { padding-left:22px; margin:4px 0; }
  li { margin:2px 0; }
  pre { background:#f5f5f5; padding:10px; border-radius:4px; font-size:11px; margin:8px 0; white-space:pre-wrap; word-break:break-all; font-family:'Courier New',monospace; }
  code { background:#f5f5f5; padding:1px 4px; border-radius:3px; font-size:11px; font-family:'Courier New',monospace; }
  blockquote { border-left:3px solid #6c5ce7; padding-left:10px; margin:6px 0; color:#666; }
  hr { border:none; border-top:1px solid #ddd; margin:10px 0; }
  img { max-width:100%; }
</style></head>
<body>
  <h1>${escapeHtml(title || '笔记')}</h1>
  ${bodyHtml}
  ${videoFooter}
</body></html>`;

    // Create hidden window to render HTML and print to PDF
    if (pdfWindow) { pdfWindow.close(); }
    pdfWindow = new BrowserWindow({
      width: 800, height: 600, show: false, webPreferences: { offscreen: true }
    });

    await pdfWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(styledHtml));
    await new Promise(r => setTimeout(r, 1000)); // Wait for layout

    const buffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0.6in', bottom: '0.6in', left: '0.8in', right: '0.8in' },
    });

    pdfWindow.close();
    pdfWindow = null;
    fs.writeFileSync(filePath, buffer);
    return { success: true };
  } catch (e: any) {
    if (pdfWindow) { pdfWindow.close(); pdfWindow = null; }
    return { success: false, error: e.message };
  }
});

// DOCX Export (handled in main process where CJS modules work)
ipcMain.handle('export:docx', async (_event, { title, content, filePath, videoInfo }: { title: string; content: string; filePath: string; videoInfo?: { title?: string; author?: string; bvid?: string; url?: string } }) => {
  let docx: any;
  try {
    docx = require('docx');
  } catch {
    throw new Error('dependencies "docx" not installed — run: npm install');
  }
  try {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } = docx;

    const lines = content.split('\n');
    const children: any[] = [];

    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 },
      })
    );

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('```')) {
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        children.push(
          new Paragraph({
            spacing: { before: 200, after: 200 },
            border: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            },
            shading: { type: 'clear', fill: 'F5F5F5' },
            children: codeLines.map((cl: string) =>
              new TextRun({ text: cl, font: 'Courier New', size: 18, break: 1 })
            ),
          })
        );
        continue;
      }

      if (line.startsWith('# ')) {
        children.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 200 } }));
      } else if (line.startsWith('## ')) {
        children.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 150 } }));
      } else if (line.startsWith('### ')) {
        children.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 100 } }));
      } else if (line.startsWith('> ')) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: line.slice(2), italics: true, color: '666666' })],
            indent: { left: 400 },
            spacing: { before: 100, after: 100 },
          })
        );
      } else if (line.match(/^[-*+] /)) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: '• ', bold: true }), new TextRun({ text: line.replace(/^[-*+] /, '') })],
            indent: { left: 400 },
            spacing: { before: 40, after: 40 },
          })
        );
      } else if (line.match(/^\d+\. /)) {
        const num = line.match(/^\d+\./)?.[0] + ' ';
        children.push(
          new Paragraph({
            children: [new TextRun({ text: num, bold: true }), new TextRun({ text: line.replace(/^\d+\. /, '') })],
            indent: { left: 400 },
            spacing: { before: 40, after: 40 },
          })
        );
      } else if (line.trim() === '') {
        children.push(new Paragraph({ spacing: { before: 60, after: 60 } }));
      } else {
        children.push(new Paragraph({ text: line, spacing: { before: 40, after: 40 } }));
      }
    }

    // Add video source footer if present
    if (videoInfo?.title) {
      const parts = [`关联视频: ${videoInfo.title}`];
      if (videoInfo.author) parts.push(`UP主: ${videoInfo.author}`);
      if (videoInfo.bvid) parts.push(`BV号: ${videoInfo.bvid}`);
      if (videoInfo.url) parts.push(`链接: ${videoInfo.url}`);
      children.push(new Paragraph({ spacing: { before: 200, after: 200 }, border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } } }));
      children.push(new Paragraph({ children: [new TextRun({ text: parts.join(' · '), italics: true, color: '888888', size: 18 })] }));
    }

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);
    return true;
  } catch (e: any) {
    throw new Error(`DOCX export failed: ${e.message}`);
  }
});

// Settings — always load/save from default location so they're findable on restart
ipcMain.handle('settings:load', async () => {
  return loadJSON(path.join(DEFAULT_DATA_DIR, 'settings.json')) || {};
});

ipcMain.handle('settings:save', async (_event, settings: any) => {
  saveJSON(path.join(DEFAULT_DATA_DIR, 'settings.json'), settings);
  return true;
});

// Storage path management
ipcMain.handle('storage:select-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    title: '选择数据存储目录',
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('storage:change-path', async (_event, newPath: string) => {
  try {
    // Ensure new directory exists
    if (!fs.existsSync(newPath)) fs.mkdirSync(newPath, { recursive: true });

    // Migrate existing data files
    const files = ['notes.json', 'folders.json'];
    for (const file of files) {
      const src = path.join(DATA_DIR, file);
      const dst = path.join(newPath, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }
    }

    // Update settings with new path — save to default location
    const settings = loadJSON(path.join(DEFAULT_DATA_DIR, 'settings.json')) || {};
    settings.storagePath = newPath;
    saveJSON(path.join(DEFAULT_DATA_DIR, 'settings.json'), settings);

    // Update runtime DATA_DIR
    DATA_DIR = newPath;

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

// Bilibili cover proxy
ipcMain.handle('bilibili:cover-proxy', async (_event, coverUrl: string) => {
  try {
    const response = await fetch(coverUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const ext = path.extname(new URL(coverUrl).pathname) || '.jpg';
    const mimeMap: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
    const mime = mimeMap[ext] || 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (e: any) {
    return null;
  }
});

ipcMain.handle('file:select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const mime = mimeMap[ext] || 'image/png';
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    return `data:${mime};base64,${base64}`;
  }
  return null;
});