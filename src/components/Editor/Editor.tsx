import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Code, Link, Image, Eye, Edit3, Split, FileText,
  Pin, Trash2, Copy, FileDown, Tag, Palette, X, Check
} from 'lucide-react';
import BilibiliPanel from '../Bilibili/BilibiliPanel';
import ExportDialog from '../Export/ExportDialog';
import NoteOverview from '../Overview/NoteOverview';

type ViewMode = 'edit' | 'preview' | 'split';

const NOTE_COLORS = [
  { value: '', label: '无' },
  { value: '#e74c3c', label: '红' },
  { value: '#e67e22', label: '橙' },
  { value: '#f1c40f', label: '黄' },
  { value: '#2ecc71', label: '绿' },
  { value: '#1abc9c', label: '青' },
  { value: '#3498db', label: '蓝' },
  { value: '#9b59b6', label: '紫' },
  { value: '#e84393', label: '粉' },
];

function Editor() {
  const { notes, selectedNoteId, updateNote, deleteNote, togglePinNote, duplicateNote, addTag, removeTag, setNoteColor, allTags } = useStore();
  const selectedNote = notes.find((n) => n.id === selectedNoteId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showExport, setShowExport] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const insertFormat = useCallback((prefix: string, suffix: string = '') => {
    const ta = textareaRef.current;
    if (!ta || !selectedNoteId) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
    updateNote(selectedNoteId, { content: newText });
    requestAnimationFrame(() => {
      ta.focus();
      if (selected) ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      else ta.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  }, [selectedNoteId, updateNote]);

  const handleToolbarAction = useCallback((action: string) => {
    switch (action) {
      case 'bold': insertFormat('**', '**'); break;
      case 'italic': insertFormat('*', '*'); break;
      case 'h1': insertFormat('# '); break;
      case 'h2': insertFormat('## '); break;
      case 'h3': insertFormat('### '); break;
      case 'ul': insertFormat('- '); break;
      case 'ol': insertFormat('1. '); break;
      case 'quote': insertFormat('> '); break;
      case 'code': insertFormat('```\n', '\n```'); break;
      case 'link': insertFormat('[', '](url)'); break;
      case 'image': handleImageInsert(); break;
    }
  }, [insertFormat]);

  const handleImageInsert = async () => {
    if (window.electronAPI) {
      const dataUrl = await window.electronAPI.selectImage();
      if (dataUrl) insertFormat(`![image](${dataUrl})`);
    } else {
      const url = prompt('请输入图片URL:');
      if (url) insertFormat(`![image](${url})`);
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') { e.preventDefault(); insertFormat('  '); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); handleToolbarAction('bold'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); handleToolbarAction('italic'); }
  }, [insertFormat, handleToolbarAction]);

  const handleAddTag = () => {
    const val = tagInputRef.current?.value || '';
    if (!selectedNoteId || !val.trim()) return;
    addTag(selectedNoteId, val.trim());
    setTagInput('');
    if (tagInputRef.current) tagInputRef.current.value = '';
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
    if (e.key === 'Escape') setShowTagSuggestions(false);
  };

  const filteredTagSuggestions = allTags.filter(
    (t) => t.includes(tagInput.toLowerCase()) && !(selectedNote?.tags || []).includes(t)
  );

  // Process [toc] in content
  const processToc = useCallback((content: string): string => {
    if (!content.includes('[toc]')) return content;
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings: { level: number; text: string; anchor: string }[] = [];
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const text = match[2].replace(/[#*`>\[\]()_~]/g, '').trim();
      headings.push({ level: match[1].length, text, anchor: text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w一-鿿-]/g, '') });
    }

    if (headings.length === 0) return content.replace('[toc]', '*（无标题）*');

    let tocHtml = '<details open class="toc-container"><summary class="toc-title">📑 目录</summary>\n';
    let prevLevel = 0;
    for (const h of headings) {
      const indent = h.level - 1;
      if (h.level > prevLevel) {
        tocHtml += '\n'.repeat(indent - (prevLevel > 0 ? prevLevel - 1 : 0));
      }
      tocHtml += `<div class="toc-item" style="padding-left:${indent * 16}px"><a href="#${h.anchor}" class="toc-link">${h.text}</a></div>\n`;
      prevLevel = h.level;
    }
    tocHtml += '</details>\n';
    return content.replace('[toc]', tocHtml);
  }, []);

  const processedContent = useMemo(() => {
    if (!selectedNote) return '';
    return processToc(selectedNote.content);
  }, [selectedNote?.content, processToc]);

  // Close color picker on outside click
  useEffect(() => {
    const handler = () => setShowColorPicker(false);
    if (showColorPicker) { setTimeout(() => document.addEventListener('click', handler), 0); return () => document.removeEventListener('click', handler); }
  }, [showColorPicker]);

  if (!selectedNote) {
    return (
      <div className="main-content">
        <NoteOverview />
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="editor-container">
        <div className="editor-header">
          <input className="editor-title-input" placeholder="笔记标题"
            value={selectedNote.title}
            onChange={(e) => updateNote(selectedNote.id, { title: e.target.value })}
          />
          <div className="editor-actions">
            {/* Color Picker */}
            <div className="color-picker-wrapper" style={{ position: 'relative' }}>
              <button className={`btn btn-ghost ${selectedNote.color ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }} title="笔记颜色">
                <Palette size={16} />
              </button>
              {showColorPicker && (
                <div className="color-picker-dropdown" onClick={(e) => e.stopPropagation()}>
                  {NOTE_COLORS.map((c) => (
                    <span key={c.value}
                      className={`color-option ${selectedNote.color === c.value ? 'selected' : ''}`}
                      style={c.value ? { background: c.value } : { background: 'var(--bg-tertiary)', border: '1px dashed var(--text-muted)' }}
                      onClick={() => { setNoteColor(selectedNote.id, c.value); setShowColorPicker(false); }}
                      title={c.label}
                    />
                  ))}
                </div>
              )}
            </div>
            <button className={`btn btn-ghost ${selectedNote.pinned ? 'active' : ''}`}
              onClick={() => togglePinNote(selectedNote.id)} title="置顶">
              <Pin size={16} />
            </button>
            <button className="btn btn-ghost" onClick={() => duplicateNote(selectedNote.id)} title="复制">
              <Copy size={16} />
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowExport(true)} title="导出">
              <FileDown size={14} /> 导出
            </button>
            <button className="btn btn-ghost" onClick={() => deleteNote(selectedNote.id)} title="删除">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="editor-tags">
          <Tag size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <div className="tags-list">
            {selectedNote.tags.map((tag) => (
              <span key={tag} className="tag-badge">
                {tag}
                <button className="tag-remove" onClick={() => removeTag(selectedNote.id, tag)}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <input className="tag-input" placeholder="添加标签..."
              ref={tagInputRef}
              value={tagInput}
              onChange={(e) => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
              onKeyDown={handleTagKeyDown}
              onFocus={() => setShowTagSuggestions(true)}
            />
            {showTagSuggestions && tagInput && filteredTagSuggestions.length > 0 && (
              <div className="tag-suggestions">
                {filteredTagSuggestions.map((t) => (
                  <div key={t} className="tag-suggestion-item"
                    onClick={() => { addTag(selectedNote.id, t); setTagInput(''); setShowTagSuggestions(false); }}>
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="editor-toolbar">
          <div className="toolbar-group">
            <button className="toolbar-btn" onClick={() => handleToolbarAction('bold')} title="粗体 Ctrl+B"><Bold size={16} /></button>
            <button className="toolbar-btn" onClick={() => handleToolbarAction('italic')} title="斜体 Ctrl+I"><Italic size={16} /></button>
          </div>
          <div className="toolbar-group">
            <button className="toolbar-btn" onClick={() => handleToolbarAction('h1')} title="标题1"><Heading1 size={16} /></button>
            <button className="toolbar-btn" onClick={() => handleToolbarAction('h2')} title="标题2"><Heading2 size={16} /></button>
            <button className="toolbar-btn" onClick={() => handleToolbarAction('h3')} title="标题3"><Heading3 size={16} /></button>
          </div>
          <div className="toolbar-group">
            <button className="toolbar-btn" onClick={() => handleToolbarAction('ul')} title="无序列表"><List size={16} /></button>
            <button className="toolbar-btn" onClick={() => handleToolbarAction('ol')} title="有序列表"><ListOrdered size={16} /></button>
            <button className="toolbar-btn" onClick={() => handleToolbarAction('quote')} title="引用"><Quote size={16} /></button>
            <button className="toolbar-btn" onClick={() => handleToolbarAction('code')} title="代码块"><Code size={16} /></button>
          </div>
          <div className="toolbar-group">
            <button className="toolbar-btn" onClick={() => handleToolbarAction('link')} title="插入链接"><Link size={16} /></button>
            <button className="toolbar-btn" onClick={() => handleToolbarAction('image')} title="插入图片"><Image size={16} /></button>
          </div>
          <div style={{ flex: 1 }} />
          <div className="view-toggle">
            <button className={`view-toggle-btn ${viewMode === 'edit' ? 'active' : ''}`} onClick={() => setViewMode('edit')}><Edit3 size={14} style={{ marginRight: 4 }} />编辑</button>
            <button className={`view-toggle-btn ${viewMode === 'split' ? 'active' : ''}`} onClick={() => setViewMode('split')}><Split size={14} style={{ marginRight: 4 }} />分屏</button>
            <button className={`view-toggle-btn ${viewMode === 'preview' ? 'active' : ''}`} onClick={() => setViewMode('preview')}><Eye size={14} style={{ marginRight: 4 }} />预览</button>
          </div>
        </div>

        {/* Editor body */}
        {viewMode === 'split' ? (
          <div className="split-view">
            <textarea ref={textareaRef} className="editor-textarea"
              placeholder="在此输入 Markdown 内容..."
              value={selectedNote.content}
              onChange={(e) => updateNote(selectedNote.id, { content: e.target.value })}
              onKeyDown={handleKeyDown}
            />
            <div className="editor-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {processedContent || '*（空笔记）*'}
              </ReactMarkdown>
            </div>
          </div>
        ) : viewMode === 'edit' ? (
          <textarea ref={textareaRef} className="editor-textarea"
            placeholder="在此输入 Markdown 内容..."
            value={selectedNote.content}
            onChange={(e) => updateNote(selectedNote.id, { content: e.target.value })}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <div className="editor-preview">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {processedContent || '*（空笔记）*'}
            </ReactMarkdown>
          </div>
        )}

        {/* Metadata bar */}
        <div className="editor-metadata">
          <span>创建于 {new Date(selectedNote.createdAt).toLocaleString('zh-CN')}</span>
          <span>修改于 {new Date(selectedNote.updatedAt).toLocaleString('zh-CN')}</span>
          <span>{selectedNote.wordCount} 字</span>
        </div>
      </div>

      <BilibiliPanel noteId={selectedNote.id} />
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </div>
  );
}

export default Editor;
