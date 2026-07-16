import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import {
  FileText, FileDown, FileType, File, X,
  Check, Loader2
} from 'lucide-react';
import { isCapacitor, saveFileViaCapacitor } from '../../utils/platform';

interface ExportDialogProps {
  onClose: () => void;
}

function ExportDialog({ onClose }: ExportDialogProps) {
  const { notes } = useStore();
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState<string | null>(null);

  const note = notes.find((n) => n.id === useStore.getState().selectedNoteId);

  const escapeHtml = (text: string) => {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  const mdToSimpleHtml = (text: string) => {
    let html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3 style="margin:12px 0 6px;font-size:15px;">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 style="margin:14px 0 8px;font-size:17px;">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 style="margin:16px 0 10px;font-size:20px;border-bottom:2px solid #6c5ce7;padding-bottom:6px;">$1</h1>')
      .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #6c5ce7;padding-left:12px;margin:8px 0;color:#666;">$1</blockquote>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li style="margin:2px 0;">$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li style="margin:2px 0;">$1</li>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
    // Handle code blocks
    html = html.replace(/```[\s\S]*?```/g, (m: string) => {
      const code = m.replace(/```.*\n/, '').replace(/\n```$/, '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return '<pre style="background:#f5f5f5;padding:10px;border-radius:4px;font-size:10pt;margin:8px 0;"><code>' + code + '</code></pre>';
    });
    return html;
  };

  const saveFile = async (content: string | Blob, defaultName: string, ext: string) => {
    const api = window.electronAPI;
    if (api) {
      const result = await api.showSaveDialog({
        defaultName,
        filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
      });
      if (!result.canceled && result.filePath) {
        const filePath: string = result.filePath;
        if (typeof content === 'string') {
          await api.writeFile(filePath, content);
        } else {
          const reader = new FileReader();
          reader.readAsDataURL(content);
          await new Promise<void>((resolve, reject) => {
            reader.onload = async () => {
              const dataUrl = reader.result as string;
              await api.writeFile(filePath, dataUrl);
              resolve();
            };
            reader.onerror = reject;
          });
        }
      }
    } else if (isCapacitor()) {
      await saveFileViaCapacitor(content, defaultName);
    } else {
      const blob = typeof content === 'string' ? new Blob([content]) : content;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const exportAsMarkdown = async () => {
    if (!note) return;
    setExporting(true);
    try {
      const content = `# ${note.title}\n\n${note.content}`;
      await saveFile(content, `${note.title || '笔记'}.md`, 'md');
      setExportDone('Markdown');
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const exportAsPlainText = async () => {
    if (!note) return;
    setExporting(true);
    try {
      const plainText = note.content
        .replace(/#{1,6}\s+/g, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`{1,3}[^`]*`{1,3}/g, (m: string) => m.replace(/`/g, ''))
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .replace(/!\[.*?\]\(.+?\)/g, '[图片]')
        .replace(/>\s+/g, '')
        .replace(/[-*+]\s+/g, '');
      const content = `${note.title}\n\n${plainText}`;
      await saveFile(content, `${note.title || '笔记'}.txt`, 'txt');
      setExportDone('纯文本');
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const simpleMarkdownToHtml = (title: string, content: string) => {
    let html = `<h1>${escapeHtml(title)}</h1>\n`;
    const lines = content.split('\n');
    let inCode = false;
    let codeContent = '';
    let inList = false;
    let inOrderedList = false;

    const flushList = () => {
      if (inList) { html += '</ul>\n'; inList = false; }
      if (inOrderedList) { html += '</ol>\n'; inOrderedList = false; }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('```')) {
        if (inCode) {
          html += `<pre><code>${escapeHtml(codeContent)}</code></pre>\n`;
          codeContent = '';
          inCode = false;
          flushList();
          continue;
        }
        inCode = true;
        continue;
      }
      if (inCode) { codeContent += line + '\n'; continue; }

      if (inList && !line.match(/^[-*+]\s+/)) flushList();
      if (inOrderedList && !line.match(/^\d+\.\s+/)) flushList();

      if (line.startsWith('# ')) { flushList(); html += `<h1>${escapeHtml(line.slice(2))}</h1>\n`; }
      else if (line.startsWith('## ')) { html += `<h2>${escapeHtml(line.slice(3))}</h2>\n`; }
      else if (line.startsWith('### ')) { html += `<h3>${escapeHtml(line.slice(4))}</h3>\n`; }
      else if (line.match(/^[-*+]\s+/)) {
        if (!inList) { html += '<ul>\n'; inList = true; }
        html += `  <li>${escapeHtml(line.replace(/^[-*+]\s+/, ''))}</li>\n`;
      } else if (line.match(/^\d+\.\s+/)) {
        if (!inOrderedList) { html += '<ol>\n'; inOrderedList = true; }
        html += `  <li>${escapeHtml(line.replace(/^\d+\.\s+/, ''))}</li>\n`;
      } else if (line.startsWith('> ')) {
        html += `<blockquote>${escapeHtml(line.slice(2))}</blockquote>\n`;
      } else if (line.trim() === '') { html += '<br>\n'; }
      else { html += `<p>${escapeHtml(line)}</p>\n`; }
    }
    flushList();
    if (inCode) html += `<pre><code>${escapeHtml(codeContent)}</code></pre>\n`;
    return html;
  };

  const exportAsHtml = async () => {
    if (!note) return;
    setExporting(true);
    try {
      const bodyHtml = simpleMarkdownToHtml(note.title, note.content);
      const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(note.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333; }
    h1 { border-bottom: 2px solid #6c5ce7; padding-bottom: 8px; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
    blockquote { border-left: 3px solid #6c5ce7; padding-left: 16px; margin: 16px 0; color: #666; }
    img { max-width: 100%; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
      await saveFile(htmlContent, `${note.title || '笔记'}.html`, 'html');
      setExportDone('HTML');
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const exportAsPdf = async () => {
    if (!note) return;
    setExporting(true);
    try {
      // Build HTML content
      const bodyHtml = mdToSimpleHtml(note.content || '');
      const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8">
<style>
  body { font-family: 'Microsoft YaHei','PingFang SC','Noto Sans CJK SC',sans-serif; padding:32px; color:#333; line-height:1.8; max-width:600px; margin:0 auto; }
  h1 { font-size:22px; border-bottom:2px solid #6c5ce7; padding-bottom:8px; margin-bottom:16px; }
  h2 { font-size:18px; margin:14px 0 8px; } h3 { font-size:15px; margin:12px 0 6px; }
  p, li { font-size:11pt; } pre { background:#f5f5f5; padding:12px; border-radius:6px; font-size:10pt; overflow-x:auto; }
  blockquote { border-left:3px solid #6c5ce7; padding-left:12px; margin:8px 0; color:#666; }
  img { max-width:100%; }
</style></head>
<body>
  <h1>${escapeHtml(note.title || '笔记')}</h1>
  ${bodyHtml}
</body></html>`;

      // Create a hidden container to render HTML
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '600px';
      container.style.background = 'white';
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      // Wait for fonts to render
      await new Promise(r => setTimeout(r, 300));

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      document.body.removeChild(container);

      const JsPDF = (await import('jspdf')).default;
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const doc = new JsPDF('p', 'mm', 'a4');

      let heightLeft = imgHeight;
      let position = 0;

      doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297; // A4 height in mm

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      const blob = doc.output('blob');
      await saveFile(blob, `${note.title || '笔记'}.pdf`, 'pdf');
      setExportDone('PDF');
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  const exportAsDocx = async () => {
    if (!note) return;
    const api = window.electronAPI;
    if (!api) {
      // Web mode — DOCX export is unavailable
      setExportDone('Web 模式不支持');
      return;
    }
    setExporting(true);
    try {
      const result = await api.showSaveDialog({
        defaultName: `${note.title || '笔记'}.docx`,
        filters: [{ name: 'Word Document', extensions: ['docx'] }],
      });
      if (!result.canceled && result.filePath) {
        await api.exportDocx({
          title: note.title,
          content: note.content,
          filePath: result.filePath,
        });
        setExportDone('Word');
      }
    } catch (e) {
      console.error('DOCX export failed:', e);
      setExportDone('导出失败');
    } finally {
      setExporting(false);
    }
  };

  if (!note) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2>导出笔记</h2>
          <p style={{ color: 'var(--text-muted)' }}>请先选择一篇笔记</p>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>关闭</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>导出笔记</h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        {exportDone ? (
          exportDone === '导出失败' || exportDone === 'Web 模式不支持' ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <X size={48} style={{ color: 'var(--danger)', marginBottom: 16 }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>Word 导出失败</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{exportDone === 'Web 模式不支持' ? 'Word 导出仅在 Electron 桌面版中可用，请使用其他格式。' : '请确认已安装依赖后重试，或使用其他导出格式。'}</p>
              <div className="modal-footer" style={{ justifyContent: 'center', marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => { setExportDone(null); }}>返回</button>
                <button className="btn btn-primary" onClick={onClose}>关闭</button>
              </div>
            </div>
          ) : (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Check size={48} style={{ color: 'var(--success)', marginBottom: 16 }} />
            <p>已成功导出为 {exportDone} 格式！</p>
            <div className="modal-footer" style={{ justifyContent: 'center', marginTop: 16 }}>
              <button className="btn btn-primary" onClick={onClose}>完成</button>
            </div>
          </div>
          )
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              当前笔记: <strong>{note.title || '未命名笔记'}</strong>
            </p>
            <div className="export-options">
              <div className="export-option" onClick={exportAsMarkdown}>
                <div className="export-option-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                  <FileText size={20} />
                </div>
                <div className="export-option-info">
                  <h4>Markdown (.md)</h4>
                  <p>保留完整格式标记，适合开发者使用</p>
                </div>
              </div>

              <div className="export-option" onClick={exportAsDocx}>
                <div className="export-option-icon" style={{ background: '#e8f4fd', color: '#2b5797' }}>
                  <FileDown size={20} />
                </div>
                <div className="export-option-info">
                  <h4>Word 文档 (.docx)</h4>
                  <p>适合在 Microsoft Word 中打开编辑</p>
                </div>
              </div>

              <div className="export-option" onClick={exportAsPdf}>
                <div className="export-option-icon" style={{ background: '#fce4ec', color: '#c62828' }}>
                  <File size={20} />
                </div>
                <div className="export-option-info">
                  <h4>PDF 文档 (.pdf)</h4>
                  <p>适合打印或分享，跨平台显示一致</p>
                </div>
              </div>

              <div className="export-option" onClick={exportAsHtml}>
                <div className="export-option-icon" style={{ background: '#fff3e0', color: '#e65100' }}>
                  <FileType size={20} />
                </div>
                <div className="export-option-info">
                  <h4>HTML 网页 (.html)</h4>
                  <p>可直接在浏览器中打开查看</p>
                </div>
              </div>

              <div className="export-option" onClick={exportAsPlainText}>
                <div className="export-option-icon" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
                  <FileText size={20} />
                </div>
                <div className="export-option-info">
                  <h4>纯文本 (.txt)</h4>
                  <p>不保留格式，仅含文字内容</p>
                </div>
              </div>
            </div>

            {exporting && (
              <div style={{ textAlign: 'center', padding: 16 }}>
                <Loader2 size={24} className="spin" style={{ color: 'var(--accent)' }} />
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>正在导出...</p>
              </div>
            )}

            <div className="modal-footer" style={{ marginTop: 12 }}>
              <button className="btn btn-secondary" onClick={onClose} disabled={exporting}>取消</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ExportDialog;
