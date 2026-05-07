import { useState, useRef } from 'react';
import { Download, Upload, CloudLightning } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { syncToGoogleSheets } from '../services/googleSheets';
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

    setSyncStatus({ loading: true, message: '正在檢查重複資料並同步...', type: '' });

    try {
      const result = await syncToGoogleSheets(settings.gasUrl, settledBills);

      if (result.success) {
        if (result.skipped) {
          setSyncStatus({ loading: false, message: '同步完成：雲端已有最新紀錄，無需重複上傳。', type: 'success' });
        } else {
          setSyncStatus({ loading: false, message: `同步成功！${result.message || ''}`, type: 'success' });
        }
      } else {
        setSyncStatus({ loading: false, message: result.message || '同步失敗，請檢查網路或設定。', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      setSyncStatus({ loading: false, message: `同步失敗：${error.message}`, type: 'error' });
    }
  };

  return (
    <div className="export-page">
      <div className="card setting-section">
        <h2>資料備份與同步</h2>
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
