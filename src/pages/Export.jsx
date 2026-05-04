import { useState, useRef } from 'react';
import { Download, Upload, CloudLightning } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import './Export.css';

export default function Export() {
  const { settings, setSettings, meterReadings, settledBills } = useAppContext();
  const [syncStatus, setSyncStatus] = useState({ loading: false, message: '', type: '' });
  const fileInputRef = useRef(null);

  const handleExportJSON = () => {
    const data = {
      meterReadings,
      settledBills,
      settings,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `power-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.meterReadings && data.settledBills) {
          localStorage.setItem('meterReadings', JSON.stringify(data.meterReadings));
          localStorage.setItem('settledBills', JSON.stringify(data.settledBills));
          if (data.settings) localStorage.setItem('settings', JSON.stringify(data.settings));
          
          alert('匯入成功！系統即將重新載入...');
          window.location.reload();
        } else {
          alert('匯入失敗：檔案格式不正確');
        }
      } catch (err) {
        alert('匯入失敗：無法解析 JSON 檔案');
      }
    };
    reader.readAsText(file);
    // reset input
    e.target.value = null;
  };

  const handleSyncToSheets = async () => {
    if (!settings.gasUrl) {
      alert('請先設定 Google Apps Script Web App URL！');
      return;
    }

    if (settledBills.length === 0) {
      alert('目前沒有結算資料可供匯出！');
      return;
    }

    setSyncStatus({ loading: true, message: '正在同步資料到 Google Sheets...', type: '' });

    try {
      const response = await fetch(settings.gasUrl, {
        method: 'POST',
        body: JSON.stringify(settledBills),
        // no-cors mode might not return readable response, but we need JSON response to verify success.
        // Google Apps script allows CORS if doOptions is setup properly. We will assume CORS works.
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // GAS requires text/plain for postData to bypass CORS preflight easily
        }
      });

      const result = await response.json();

      if (result.success) {
        setSyncStatus({ loading: false, message: '同步成功！已將所有資料寫入 db 工作表。', type: 'success' });
      } else {
        setSyncStatus({ loading: false, message: `同步失敗：${result.error}`, type: 'error' });
      }
    } catch (error) {
      console.error(error);
      setSyncStatus({ loading: false, message: '同步失敗：網路錯誤或 CORS 設定有誤', type: 'error' });
    }
  };

  return (
    <div className="export-page">
      <h1 className="page-title">設定與匯出</h1>

      <div className="card setting-section">
        <h2>Google Sheets 整合</h2>
        <p className="text-small">
          貼上您部署好的 Google Apps Script Web App URL，以啟用預算讀取與自動同步功能。
        </p>
        <div className="setting-group">
          <label>Web App URL</label>
          <input 
            type="text" 
            placeholder="https://script.google.com/macros/s/.../exec"
            value={settings.gasUrl}
            onChange={(e) => setSettings({ ...settings, gasUrl: e.target.value })}
          />
        </div>
        <button 
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={handleSyncToSheets}
          disabled={syncStatus.loading}
        >
          <CloudLightning size={20} />
          {syncStatus.loading ? '同步中...' : '將結算資料匯出至 Google Sheets'}
        </button>
        {syncStatus.message && (
          <div className={`sync-status ${syncStatus.type}`}>
            {syncStatus.message}
          </div>
        )}
      </div>

      <div className="card setting-section">
        <h2>本機資料備份</h2>
        <p className="text-small">
          將所有指針紀錄與結算資料匯出成 JSON 檔案，或是從 JSON 檔案還原。
        </p>
        <button className="btn-secondary" onClick={handleExportJSON}>
          <Download size={20} />
          匯出備份 (JSON)
        </button>
        
        <input 
          type="file" 
          accept=".json" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />
        <button className="btn-secondary" onClick={handleImportClick}>
          <Upload size={20} />
          匯入備份 (JSON)
        </button>
      </div>

    </div>
  );
}
