import React, { useState } from 'react';
import { X, Moon, Sun, Monitor, Palette, FolderOpen, Eye, RefreshCw, Check, AlertCircle, BookMarked, Leaf } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface SettingsDialogProps {
  onClose: () => void;
}

function SettingsDialog({ onClose }: SettingsDialogProps) {
  const { settings, updateSettings } = useStore();
  const [hexInput, setHexInput] = useState(settings.accentColor);
  const [changingPath, setChangingPath] = useState(false);
  const [pathResult, setPathResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHexInput(e.target.value);
  };

  const handleHexBlur = () => {
    const hex = hexInput.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      updateSettings({ accentColor: hex });
    } else {
      setHexInput(settings.accentColor);
    }
  };

  const handleChangeStoragePath = async () => {
    const api = window.electronAPI;
    if (!api) {
      setPathResult({ ok: false, msg: '仅 Electron 桌面版支持此功能' });
      return;
    }
    setChangingPath(true);
    setPathResult(null);
    try {
      const selectedPath = await api.selectStorageDir();
      if (!selectedPath) { setChangingPath(false); return; }
      const result = await api.changeStoragePath(selectedPath);
      if (result.success) {
        updateSettings({ storagePath: selectedPath });
        setPathResult({ ok: true, msg: '存储位置已更改，笔记数据已迁移' });
      } else {
        setPathResult({ ok: false, msg: result.error || '更改失败' });
      }
    } catch (e: any) {
      setPathResult({ ok: false, msg: e.message });
    } finally {
      setChangingPath(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>设置</h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title"><Sun size={16} /> 主题</h3>
          <div className="theme-options">
            <button className={`theme-option ${settings.theme === 'dark' ? 'active' : ''}`} onClick={() => updateSettings({ theme: 'dark' })}>
              <Moon size={20} /><span>深色</span>
            </button>
            <button className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`} onClick={() => updateSettings({ theme: 'light' })}>
              <Sun size={20} /><span>浅色</span>
            </button>
            <button className={`theme-option ${settings.theme === 'system' ? 'active' : ''}`} onClick={() => updateSettings({ theme: 'system' })}>
              <Monitor size={20} /><span>跟随系统</span>
            </button>
            <button className={`theme-option ${settings.theme === 'paper' ? 'active' : ''}`} onClick={() => updateSettings({ theme: 'paper' })}>
              <BookMarked size={20} /><span>米黄纸色</span>
            </button>
            <button className={`theme-option ${settings.theme === 'green' ? 'active' : ''}`} onClick={() => updateSettings({ theme: 'green' })}>
              <Leaf size={20} /><span>绿色护眼</span>
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title"><Palette size={16} /> 主题色</h3>
          <div className="accent-color-picker">
            {['#6c5ce7','#3498db','#2ecc71','#e74c3c','#e67e22','#f1c40f','#1abc9c','#9b59b6','#e84393','#fd79a8','#00b894','#636e72'].map((color) => (
              <span key={color} className={`accent-color-option ${settings.accentColor === color ? 'selected' : ''}`}
                style={{ background: color }} onClick={() => { updateSettings({ accentColor: color }); setHexInput(color); }} title={color} />
            ))}
          </div>
          <div className="color-input-wrapper">
            <label>自定义</label>
            <input type="color" className="accent-color-input" value={settings.accentColor}
              onChange={(e) => { updateSettings({ accentColor: e.target.value }); setHexInput(e.target.value); }} />
            <input className="input color-input-hex" style={{ width: 110 }} value={hexInput}
              onChange={handleHexChange} onBlur={handleHexBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') handleHexBlur(); }} placeholder="#6c5ce7" />
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title"><Eye size={16} /> 显示选项</h3>
          <div className="toggle-row">
            <div className="toggle-info">
              <span className="toggle-label">总览中显示视频封面</span>
              <span className="toggle-desc">在笔记总览卡片上展示关联的 Bilibili 视频封面</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={settings.showVideoCoverInOverview}
                onChange={(e) => updateSettings({ showVideoCoverInOverview: e.target.checked })} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title"><FolderOpen size={16} /> 存储位置</h3>
          <p className="settings-description">选择笔记数据的存储目录。更改后现有数据会自动迁移。</p>
          <div className="storage-path-row">
            <input className="input" value={settings.storagePath || '默认位置 (用户数据目录)'} readOnly />
            <button className="btn btn-secondary btn-sm" onClick={handleChangeStoragePath} disabled={changingPath} style={{ flexShrink: 0 }}>
              {changingPath ? <RefreshCw size={14} className="spin" /> : <FolderOpen size={14} />}
              更改
            </button>
          </div>
          {pathResult && (
            <div className={`storage-path-result ${pathResult.ok ? 'success' : 'error'}`}>
              {pathResult.ok ? <Check size={14} /> : <AlertCircle size={14} />}
              {pathResult.msg}
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="btn btn-primary" onClick={onClose}>完成</button>
        </div>
      </div>
    </div>
  );
}

export default SettingsDialog;