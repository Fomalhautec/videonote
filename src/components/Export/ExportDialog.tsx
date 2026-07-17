import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FileText, FileDown, FileType, File, X, Check, Loader2 } from 'lucide-react';
import { isCapacitor, saveFileViaCapacitor } from '../../utils/platform';

interface ExportDialogProps { onClose: () => void; }

function ExportDialog({ onClose }: ExportDialogProps) {
  const { notes } = useStore();
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState<string | null>(null);
  const note = notes.find((n) => n.id === useStore.getState().selectedNoteId);

  const escapeHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const stripToc = (c: string) => c.replace(/\[toc\]/gi, '');
  const getVideoFooter = () => {
    if (!note?.videoInfo?.title) return '';
    const v = note.videoInfo;
    const parts = [`关联视频: ${v.title}`];
    if (v.author) parts.push(`UP主: ${v.author}`);
    if (v.bvid) parts.push(`BV号: ${v.bvid}`);
    if (v.url) parts.push(`链接: ${v.url}`);
    return '\n\n---\n' + parts.join(' · ') + '\n';
  };
  const getVideoFooterHtml = () => {
    if (!note?.videoInfo?.title) return '';
    const v = note.videoInfo;
    const parts = [`关联视频: ${escapeHtml(v.title)}`];
    if (v.author) parts.push(`UP主: ${escapeHtml(v.author)}`);
    if (v.bvid) parts.push(`BV号: ${v.bvid}`);
    if (v.url) parts.push(`<a href="${escapeHtml(v.url)}">${escapeHtml(v.url)}</a>`);
    return '<hr><p style="font-size:12px;color:#888;margin-top:12px;">' + parts.join(' · ') + '</p>';
  };

  const mdToSimpleHtml = (text: string) => {
    const codeBlocks: string[] = [];
    let processed = text.replace(/```[\s\S]*?```/g, (m: string) => {
      const code = m.replace(/```.*\n?/, '').replace(/\n?```$/, '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const idx = codeBlocks.length;
      codeBlocks.push('<pre style="background:#f5f5f5;padding:10px;border-radius:4px;font-size:9pt;margin:8px 0;white-space:pre-wrap;word-break:break-all;"><code>' + code + '</code></pre>');
      return '%%CB' + idx + '%%';
    });
    let html = '';
    const lines = processed.split('\n');
    let inUl = false, inOl = false;
    const f = () => { if (inUl) { html += '</ul>\n'; inUl = false; } if (inOl) { html += '</ol>\n'; inOl = false; } };
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.includes('%%CB')) { f(); html += l.replace(/%%CB(\d+)%%/g, (_, j) => codeBlocks[parseInt(j)]) + '\n'; continue; }
      if (l.startsWith('# ')) { f(); html += '<h1 style="margin:16px 0 10px;font-size:20px;border-bottom:2px solid #6c5ce7;padding-bottom:6px;">' + escapeHtml(l.slice(2)) + '</h1>\n'; }
      else if (l.startsWith('## ')) { f(); html += '<h2 style="margin:14px 0 8px;font-size:17px;">' + escapeHtml(l.slice(3)) + '</h2>\n'; }
      else if (l.startsWith('### ')) { f(); html += '<h3 style="margin:12px 0 6px;font-size:14px;">' + escapeHtml(l.slice(4)) + '</h3>\n'; }
      else if (l.startsWith('> ')) { f(); html += '<blockquote style="border-left:3px solid #6c5ce7;padding-left:10px;margin:6px 0;color:#666;">' + escapeHtml(l.slice(2)) + '</blockquote>\n'; }
      else if (l.match(/^- /)) { if (inOl) { html += '</ol>\n'; inOl = false; } if (!inUl) { html += '<ul>\n'; inUl = true; } html += '<li style="margin:2px 0;">' + escapeHtml(l.replace(/^- /, '')) + '</li>\n'; }
      else if (l.match(/^\d+\. /)) { if (inUl) { html += '</ul>\n'; inUl = false; } if (!inOl) { html += '<ol>\n'; inOl = true; } html += '<li style="margin:2px 0;">' + escapeHtml(l.replace(/^\d+\. /, '')) + '</li>\n'; }
      else if (l.startsWith('---') || l.startsWith('***')) { f(); html += '<hr>\n'; }
      else if (l.trim() === '') { f(); }
      else { f(); html += '<p style="margin:4px 0;">' + escapeHtml(l).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>') + '</p>\n'; }
    }
    f();
    return html;
  };

  const saveFile = async (content: string | Blob, defaultName: string, ext: string) => {
    const api = window.electronAPI;
    if (api) {
      const result = await api.showSaveDialog({ defaultName, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
      if (!result.canceled && result.filePath) {
        const fp = result.filePath;
        if (typeof content === 'string') { await api.writeFile(fp, content); }
        else {
          const r = new FileReader();
          await new Promise<void>((resolve) => { r.onload = async () => { await api.writeFile(fp, r.result as string); resolve(); }; r.readAsDataURL(content); });
        }
      }
    } else if (isCapacitor()) { await saveFileViaCapacitor(content, defaultName); }
    else {
      const blob = typeof content === 'string' ? new Blob([content]) : content;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = defaultName; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const exportAsMarkdown = async () => {
    if (!note) return; setExporting(true);
    try { await saveFile('# ' + note.title + '\n\n' + stripToc(note.content) + getVideoFooter(), (note.title || '笔记') + '.md', 'md'); setExportDone('Markdown'); }
    catch (e) { console.error(e); } finally { setExporting(false); }
  };

  const exportAsPlainText = async () => {
    if (!note) return; setExporting(true);
    try {
      const pt = stripToc(note.content).replace(/#{1,6}\s+/g, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, '')).replace(/\[(.+?)\]\(.+?\)/g, '$1').replace(/!\[.*?\]\(.+?\)/g, '[图片]').replace(/>\s+/g, '').replace(/[-*+]\s+/g, '');
      const vf = getVideoFooter().replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[(.+?)\]\(.+?\)/g, '$1');
      await saveFile(note.title + '\n\n' + pt + vf, (note.title || '笔记') + '.txt', 'txt');
      setExportDone('纯文本');
    } catch (e) { console.error(e); } finally { setExporting(false); }
  };

  const simpleMarkdownToHtml = (title: string, content: string) => {
    let html = '<h1>' + escapeHtml(title) + '</h1>\n';
    const lines = content.split('\n');
    let inCode = false, code = '', inList = false, inOl2 = false;
    const f2 = () => { if (inList) { html += '</ul>\n'; inList = false; } if (inOl2) { html += '</ol>\n'; inOl2 = false; } };
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.startsWith('```')) {
        if (inCode) { html += '<pre><code>' + escapeHtml(code) + '</code></pre>\n'; code = ''; inCode = false; f2(); continue; }
        inCode = true; continue;
      }
      if (inCode) { code += l + '\n'; continue; }
      if (inList && !l.match(/^[-*+]\s+/)) f2();
      if (inOl2 && !l.match(/^\d+\.\s+/)) f2();
      if (l.startsWith('# ')) { f2(); html += '<h1>' + escapeHtml(l.slice(2)) + '</h1>\n'; }
      else if (l.startsWith('## ')) { html += '<h2>' + escapeHtml(l.slice(3)) + '</h2>\n'; }
      else if (l.startsWith('### ')) { html += '<h3>' + escapeHtml(l.slice(4)) + '</h3>\n'; }
      else if (l.match(/^[-*+]\s+/)) { if (!inList) { html += '<ul>\n'; inList = true; } html += '<li>' + escapeHtml(l.replace(/^[-*+]\s+/, '')) + '</li>\n'; }
      else if (l.match(/^\d+\.\s+/)) { if (!inOl2) { html += '<ol>\n'; inOl2 = true; } html += '<li>' + escapeHtml(l.replace(/^\d+\.\s+/, '')) + '</li>\n'; }
      else if (l.startsWith('> ')) { html += '<blockquote>' + escapeHtml(l.slice(2)) + '</blockquote>\n'; }
      else if (l.trim() === '') { html += '<br>\n'; }
      else { html += '<p>' + escapeHtml(l) + '</p>\n'; }
    }
    f2();
    if (inCode) html += '<pre><code>' + escapeHtml(code) + '</code></pre>\n';
    return html;
  };

  const exportAsHtml = async () => {
    if (!note) return; setExporting(true);
    try {
      const body = simpleMarkdownToHtml(note.title, stripToc(note.content));
      const c = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>' + escapeHtml(note.title) + '</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6;color:#333}h1{border-bottom:2px solid #6c5ce7;padding-bottom:8px}code{background:#f0f0f0;padding:2px 6px;border-radius:3px}pre{background:#f5f5f5;padding:16px;border-radius:8px;overflow-x:auto}blockquote{border-left:3px solid #6c5ce7;padding-left:16px;margin:16px 0;color:#666}img{max-width:100%}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}</style></head><body>' + body + getVideoFooterHtml() + '</body></html>';
      await saveFile(c, (note.title || '笔记') + '.html', 'html');
      setExportDone('HTML');
    } catch (e) { console.error(e); } finally { setExporting(false); }
  };

  const exportAsPdf = async () => {
    if (!note) return;
    const api = window.electronAPI;
    if (api) {
      setExporting(true);
      try {
        const result = await api.showSaveDialog({ defaultName: (note.title || '笔记') + '.pdf', filters: [{ name: 'PDF Document', extensions: ['pdf'] }] });
        if (!result.canceled && result.filePath) {
          const pdfResult = await api.exportPdf({ title: note.title, content: note.content, filePath: result.filePath, videoInfo: note.videoInfo || undefined });
          if (pdfResult.success) setExportDone('PDF');
          else throw new Error(pdfResult.error || 'unknown');
        }
      } catch (e) { console.error('PDF export failed:', e); setExportDone('导出失败'); }
      finally { setExporting(false); }
    } else {
      setExporting(true);
      try {
        const clean = stripToc(note.content || '');
        const bodyHtml = mdToSimpleHtml(clean);
        const sh = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Microsoft YaHei,PingFang SC,Noto Sans CJK SC,SimSun,sans-serif;color:#333;line-height:1.8;font-size:14px;background:white;width:595px}.c{width:595px;padding:60px 56px}h1{font-size:22px;border-bottom:2px solid #6c5ce7;padding-bottom:8px;margin-bottom:16px}h2{font-size:18px;margin:16px 0 8px}h3{font-size:15px;margin:14px 0 6px}p{margin:6px 0}ul,ol{padding-left:24px;margin:6px 0}li{margin:3px 0}pre{background:#f5f5f5;padding:12px;border-radius:4px;font-size:12px;margin:10px 0;white-space:pre-wrap}code{background:#f5f5f5;padding:1px 4px;border-radius:3px;font-size:12px}blockquote{border-left:3px solid #6c5ce7;padding-left:12px;margin:8px 0;color:#666}hr{border:none;border-top:1px solid #ddd;margin:12px 0}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #ccc;padding:6px 10px;text-align:left}th{background:#f0f0f0}</style></head><body><div class="c"><h1>' + escapeHtml(note.title || '笔记') + '</h1>' + bodyHtml + getVideoFooterHtml() + '</div></body></html>';
        const container = document.createElement('div');
        container.style.position = 'absolute'; container.style.left = '-9999px'; container.style.top = '0';
        container.style.width = '595px'; container.style.background = '#ffffff'; container.style.zIndex = '-1';
        container.innerHTML = sh; document.body.appendChild(container);
        await new Promise(r => setTimeout(r, 500));
        const h2c = (await import('html2canvas')).default;
        const canvas = await h2c(container, { scale: 3, useCORS: true, logging: false, backgroundColor: '#ffffff', width: 595, windowWidth: 595 });
        document.body.removeChild(container);
        const JsPDF = (await import('jspdf')).default;
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        const pw = 210, ph = 297;
        const th = (canvas.height * pw) / canvas.width;
        const doc = new JsPDF('p', 'mm', 'a4');
        const ppp = (ph * canvas.width) / pw;
        let sy = 0;
        while (sy < canvas.height) {
          if (sy > 0) doc.addPage();
          const ch = Math.min(ppp, canvas.height - sy);
          const pc = document.createElement('canvas'); pc.width = canvas.width; pc.height = ch;
          pc.getContext('2d')!.drawImage(canvas, 0, sy, canvas.width, ch, 0, 0, canvas.width, ch);
          doc.addImage(pc.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pw, (ch * pw) / canvas.width);
          sy += ppp;
        }
        const blob = doc.output('blob');
        await saveFile(blob, (note.title || '笔记') + '.pdf', 'pdf');
        setExportDone('PDF');
      } catch (e) { console.error('PDF export failed:', e); setExportDone('导出失败'); }
      finally { setExporting(false); }
    }
  };

  const exportAsDocx = async () => {
    if (!note) return;
    const api = window.electronAPI;
    if (api) {
      setExporting(true);
      try {
        const result = await api.showSaveDialog({ defaultName: (note.title || '笔记') + '.docx', filters: [{ name: 'Word Document', extensions: ['docx'] }] });
        if (!result.canceled && result.filePath) {
          await api.exportDocx({ title: note.title, content: stripToc(note.content), filePath: result.filePath, videoInfo: note.videoInfo || undefined });
          setExportDone('Word');
        }
      } catch (e) { console.error('DOCX export failed:', e); setExportDone('导出失败'); }
      finally { setExporting(false); }
    } else {
      setExporting(true);
      try {
        let blob: Blob;
        try {
          const dm = await import('docx');
          const { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } = dm;
          const lines = stripToc(note.content).split('\n');
          const children: any[] = [new Paragraph({ text: note.title, heading: HeadingLevel.HEADING_1, spacing: { after: 400 } })];
          for (let i = 0; i < lines.length; i++) {
            const l = lines[i];
            if (l.startsWith('```')) {
              const cl: string[] = []; i++;
              while (i < lines.length && !lines[i].startsWith('```')) { cl.push(lines[i]); i++; }
              children.push(new Paragraph({ spacing: { before: 200, after: 200 }, border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } }, shading: { type: 'clear', fill: 'F5F5F5' }, children: cl.map((x) => new TextRun({ text: x, font: 'Courier New', size: 18, break: 1 })) }));
              continue;
            }
            if (l.startsWith('# ')) children.push(new Paragraph({ text: l.slice(2), heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 200 } }));
            else if (l.startsWith('## ')) children.push(new Paragraph({ text: l.slice(3), heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 150 } }));
            else if (l.startsWith('### ')) children.push(new Paragraph({ text: l.slice(4), heading: HeadingLevel.HEADING_3, spacing: { before: 150, after: 100 } }));
            else if (l.startsWith('> ')) children.push(new Paragraph({ children: [new TextRun({ text: l.slice(2), italics: true, color: '666666' })], indent: { left: 400 }, spacing: { before: 100, after: 100 } }));
            else if (l.match(/^[-*+] /)) children.push(new Paragraph({ children: [new TextRun({ text: '• ', bold: true }), new TextRun({ text: l.replace(/^[-*+] /, '') })], indent: { left: 400 }, spacing: { before: 40, after: 40 } }));
            else if (l.match(/^\d+\. /)) { const n = l.match(/^\d+\./)?.[0] + ' '; children.push(new Paragraph({ children: [new TextRun({ text: n, bold: true }), new TextRun({ text: l.replace(/^\d+\. /, '') })], indent: { left: 400 }, spacing: { before: 40, after: 40 } })); }
            else if (l.trim() === '') children.push(new Paragraph({ spacing: { before: 60, after: 60 } }));
            else children.push(new Paragraph({ text: l, spacing: { before: 40, after: 40 } }));
          }
          const dd = new Document({ sections: [{ children }] });
          blob = await Packer.toBlob(dd);
        } catch {
          const bodyHtml = mdToSimpleHtml(stripToc(note.content));
          const hl = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + escapeHtml(note.title) + '</title><style>body{font-family:Microsoft YaHei,sans-serif;padding:20px;line-height:1.6}h1{border-bottom:2px solid #6c5ce7}</style></head><body><h1>' + escapeHtml(note.title) + '</h1>' + bodyHtml + getVideoFooterHtml() + '</body></html>';
          blob = new Blob([hl], { type: 'application/msword' });
        }
        await saveFile(blob, (note.title || '笔记') + '.docx', 'docx');
        setExportDone('Word');
      } catch (e) { console.error('DOCX export failed:', e); setExportDone('导出失败'); }
      finally { setExporting(false); }
    }
  };

  if (!note) {
    return (<div className="modal-overlay" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}><h2>导出笔记</h2><p style={{ color: 'var(--text-muted)' }}>请先选择一篇笔记</p><div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>关闭</button></div></div></div>);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>导出笔记</h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>
        {exportDone ? (
          exportDone === '导出失败' ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <X size={48} style={{ color: 'var(--danger)', marginBottom: 16 }} />
              <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>导出失败</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>请稍后重试，或使用其他导出格式。</p>
              <div className="modal-footer" style={{ justifyContent: 'center', marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => setExportDone(null)}>返回</button>
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
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>当前笔记: <strong>{note?.title || '未命名笔记'}</strong></p>
            <div className="export-options">
              <div className="export-option" onClick={exportAsMarkdown}>
                <div className="export-option-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}><FileText size={20} /></div>
                <div className="export-option-info"><h4>Markdown (.md)</h4><p>保留完整格式标记</p></div>
              </div>
              <div className="export-option" onClick={exportAsDocx}>
                <div className="export-option-icon" style={{ background: '#e8f4fd', color: '#2b5797' }}><FileDown size={20} /></div>
                <div className="export-option-info"><h4>Word 文档 (.docx)</h4><p>适合在 Word 中编辑</p></div>
              </div>
              <div className="export-option" onClick={exportAsPdf}>
                <div className="export-option-icon" style={{ background: '#fce4ec', color: '#c62828' }}><File size={20} /></div>
                <div className="export-option-info"><h4>PDF 文档 (.pdf)</h4><p>适合打印或分享</p></div>
              </div>
              <div className="export-option" onClick={exportAsHtml}>
                <div className="export-option-icon" style={{ background: '#fff3e0', color: '#e65100' }}><FileType size={20} /></div>
                <div className="export-option-info"><h4>HTML 网页 (.html)</h4><p>可在浏览器中查看</p></div>
              </div>
              <div className="export-option" onClick={exportAsPlainText}>
                <div className="export-option-icon" style={{ background: '#e8f5e9', color: '#2e7d32' }}><FileText size={20} /></div>
                <div className="export-option-info"><h4>纯文本 (.txt)</h4><p>不保留格式</p></div>
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