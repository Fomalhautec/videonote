import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Video, Link as LinkIcon, Loader2, X, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchImageAsDataUrl } from '../../utils/platform';

interface BilibiliPanelProps {
  noteId: string;
}

function BilibiliPanel({ noteId }: BilibiliPanelProps) {
  const { notes, updateNote } = useStore();
  const note = notes.find((n) => n.id === noteId);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coverSrc, setCoverSrc] = useState<string | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const videoInfo = note?.videoInfo;

  useEffect(() => {
    if (!videoInfo?.cover) { setCoverSrc(null); return; }
    setCoverLoading(true);
    fetchImageAsDataUrl(videoInfo.cover).then((dataUrl) => {
      if (dataUrl) setCoverSrc(dataUrl);
      else setCoverSrc(videoInfo.cover);
      setCoverLoading(false);
    }).catch(() => { setCoverSrc(videoInfo.cover); setCoverLoading(false); });
  }, [videoInfo?.cover]);

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    try {
      let info: any;
      if (window.electronAPI) {
        const bvidMatch = url.match(/BV[a-zA-Z0-9]+/);
        if (bvidMatch) { info = await window.electronAPI.fetchVideoInfo(bvidMatch[0]); }
        else { info = await window.electronAPI.fetchVideoInfoFromUrl(url); }
      } else {
        const bvidMatch = url.match(/BV[a-zA-Z0-9]+/);
        if (!bvidMatch) throw new Error('无法识别视频ID');
        const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvidMatch[0]}`;
        let data: any;
        try {
          // Try Capacitor native HTTP (bypasses CORS on Android WebView)
          const { CapacitorHttp } = await import('@capacitor/core');
          const resp = await CapacitorHttp.get({
            url: apiUrl,
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bilibili.com' },
          });
          data = resp.data;
        } catch {
          // Fallback: browser fetch
          const resp = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bilibili.com' } });
          const text = await resp.text();
          try { data = JSON.parse(text); } catch { throw new Error('API 响应格式错误: 服务器返回了非 JSON 内容'); }
        }
        if (data.code !== 0) throw new Error(data.message || 'API error');
        info = { title: data.data.title, cover: data.data.pic, bvid: data.data.bvid, author: data.data.owner?.name || '', duration: data.data.duration, description: data.data.desc || '' };
      }
      updateNote(noteId, { videoInfo: { ...info, url: url } });
      setUrl('');
      setCollapsed(true);
    } catch (e: any) {
      setError(e.message || '获取视频信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveVideo = () => {
    updateNote(noteId, { videoInfo: null });
    setCoverSrc(null);
    setCollapsed(false);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Collapsed state: show just the title bar
  if (videoInfo && collapsed) {
    return (
      <div className="bilibili-panel bilibili-collapsed" onClick={() => setCollapsed(false)}>
        <div className="bilibili-collapsed-bar">
          <Video size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span className="bilibili-collapsed-title">{videoInfo.title}</span>
          <ChevronUp size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); handleRemoveVideo(); }} style={{ padding: 2 }}>
            <X size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bilibili-panel">
      <div className="bilibili-input-row">
        <Video size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        {videoInfo && (
          <button className="btn btn-ghost" onClick={() => setCollapsed(true)} title="收起" style={{ padding: '2px 4px', flexShrink: 0 }}>
            <ChevronDown size={14} />
          </button>
        )}
        <input className="bilibili-input" placeholder="粘贴Bilibili视频链接或BV号..."
          value={url} onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleFetch(); }} />
        <button className="btn btn-primary btn-sm" onClick={handleFetch} disabled={loading || !url.trim()}>
          {loading ? <Loader2 size={14} className="spin" /> : <LinkIcon size={14} />} 关联
        </button>
      </div>
      {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{error}</p>}
      {videoInfo && !collapsed && (
        <div className="bilibili-card">
          {coverLoading ? (
            <div className="bilibili-cover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={20} className="spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : coverSrc ? (
            <img className="bilibili-cover" src={coverSrc} alt={videoInfo.title}
              referrerPolicy="no-referrer" crossOrigin="anonymous" onError={() => setCoverSrc(null)} />
          ) : (
            <div className="bilibili-cover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Video size={24} />
            </div>
          )}
          <div className="bilibili-info">
            <h4>{videoInfo.title}</h4>
            <p>{videoInfo.author && `UP主: ${videoInfo.author}`}{videoInfo.duration > 0 && ` · 时长: ${formatDuration(videoInfo.duration)}`}</p>
            {videoInfo.url && (
              <p><a href="#" onClick={(e) => { e.preventDefault(); if (window.electronAPI) window.electronAPI.openExternal(videoInfo.url!); else window.open(videoInfo.url!, '_blank'); }}
                style={{ color: 'var(--accent)', fontSize: 12 }}>打开视频 <ExternalLink size={10} style={{ display: 'inline' }} /></a></p>
            )}
          </div>
          <button className="btn btn-ghost" onClick={handleRemoveVideo} title="移除视频关联"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}

export default BilibiliPanel;