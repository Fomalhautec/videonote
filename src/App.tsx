import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import Sidebar from './components/Sidebar/Sidebar';
import Editor from './components/Editor/Editor';
import ExportDialog from './components/Export/ExportDialog';
import SettingsDialog from './components/Settings/SettingsDialog';

function App() {
  const { initialize, isInitialized, showSettings, setShowSettings } = useStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div className="app-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>正在加载...</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <Editor />
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
