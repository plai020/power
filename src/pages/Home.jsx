import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { AlertCircle, Lock, Unlock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import CircularProgress from '../components/CircularProgress';
import { calculateElectricityCost, calculateBudgetForRange } from '../utils/calculations';
import './Home.css';

export default function Home() {
  const { meterReadings, priceConfig, getBudgetForDate, addSettledBill, periodDates, setPeriodDates } = useAppContext();
  const navigate = useNavigate();

  const { startDate, endDate, billYear, billMonth, isLocked } = periodDates;

  // Check if Start Date - 1 day has a reading
  const isMissingStartReading = useMemo(() => {
    if (!startDate) return false;
    const previousDay = format(subDays(new Date(startDate), 1), 'yyyy-MM-dd');
    const hasReading = meterReadings.some(r => r.date === previousDay);
    return !hasReading;
  }, [startDate, meterReadings]);

  // Check if End Date has a reading (for settling)
  const isMissingEndReading = useMemo(() => {
    if (!endDate) return false;
    const hasReading = meterReadings.some(r => r.date === endDate);
    return !hasReading;
  }, [endDate, meterReadings]);

  // Calculate Dashboard Metrics
  const metrics = useMemo(() => {
    if (!startDate || !endDate) return { usage: 0, budgetUsage: 0, cost: 0, budgetCost: 0 };
    
    // Find reading on Start Date - 1
    const previousDay = format(subDays(new Date(startDate), 1), 'yyyy-MM-dd');
    const startReadingObj = meterReadings.find(r => r.date === previousDay);
    const startReading = startReadingObj ? parseInt(startReadingObj.reading, 10) : null;

    // Find latest reading within the period [startDate, endDate]
    const periodReadings = meterReadings.filter(r => {
      return r.date >= startDate && r.date <= endDate;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Descending

    const latestReadingObj = periodReadings.length > 0 ? periodReadings[0] : null;
    const latestReading = latestReadingObj ? parseInt(latestReadingObj.reading, 10) : null;

    let usage = 0;
    let budgetUsage = 0;
    let cost = 0;
    let budgetCost = 0;

    if (startReading !== null && latestReading !== null && latestReading >= startReading) {
      usage = latestReading - startReading;
      
      // Calculate budget up to the latest reading date
      budgetUsage = calculateBudgetForRange(startDate, latestReadingObj.date, getBudgetForDate);
      
      // Calculate cost
      cost = calculateElectricityCost(usage, startDate, endDate, priceConfig);
      
      // Calculate budget cost (estimated based on budget usage)
      // This might be subjective, but let's use the budget usage to estimate the budget cost
      budgetCost = calculateElectricityCost(budgetUsage, startDate, endDate, priceConfig);
    }

    return { usage, budgetUsage, cost, budgetCost };
  }, [startDate, endDate, meterReadings, priceConfig, getBudgetForDate]);

  const handleSettle = () => {
    if (!startDate || !endDate) {
      alert('請先設定起算日與結算日！');
      return;
    }
    if (isMissingEndReading) {
      alert('結算日缺少電錶紀錄，請先至月曆新增資料！');
      navigate('/calendar');
      return;
    }
    
    const newBill = {
      id: Date.now().toString(),
      year: parseInt(billYear),
      month: parseInt(billMonth),
      startDate,
      endDate,
      calculatedUsage: metrics.usage,
      calculatedCost: metrics.cost,
      actualUsage: '',
      actualCost: '',
      note: ''
    };

    addSettledBill(newBill);
    alert('已成功結算並儲存至統計頁面！');
    
    // Clear fields
    const currentYear = new Date().getFullYear().toString();
    const currentMonth = (new Date().getMonth() + 1).toString();
    setPeriodDates({ 
      startDate: '', 
      endDate: '', 
      billYear: currentYear, 
      billMonth: currentMonth,
      isLocked: false 
    });
    navigate('/statistics');
  };

  const toggleLock = () => {
    setPeriodDates({ ...periodDates, isLocked: !isLocked });
  };

  const handleYearChange = (val) => {
    if (!isLocked) setPeriodDates({ ...periodDates, billYear: val });
  };

  const handleMonthChange = (val) => {
    if (!isLocked) setPeriodDates({ ...periodDates, billMonth: val });
  };

  const currentYearNum = new Date().getFullYear();

  return (
    <div className="home-page">
      <div className="card settings-card">
        <div className="settings-header">
          <h2 className="settings-title">帳單期間設定</h2>
          <button className={`lock-btn ${isLocked ? 'locked' : ''}`} onClick={toggleLock}>
            {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
          </button>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>帳單年</label>
            <select 
              value={billYear} 
              onChange={(e) => handleYearChange(e.target.value)}
              disabled={isLocked}
            >
              <option value="">請選擇</option>
              {[-1, 0, 1, 2, 3].map(offset => (
                <option key={currentYearNum - offset} value={currentYearNum - offset}>
                  {currentYearNum - offset}年
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>帳單月</label>
            <select 
              value={billMonth} 
              onChange={(e) => handleMonthChange(e.target.value)}
              disabled={isLocked}
            >
              <option value="">請選擇</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>當期起算日</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => !isLocked && setPeriodDates({ ...periodDates, startDate: e.target.value })} 
              disabled={isLocked}
            />
          </div>
          <div className="form-group">
            <label>當期結算日</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => !isLocked && setPeriodDates({ ...periodDates, endDate: e.target.value })} 
              disabled={isLocked}
            />
          </div>
        </div>

        {isMissingStartReading && (
          <div className="alert-box warning" onClick={() => navigate('/calendar')}>
            <AlertCircle size={20} />
            <span>起算日的前一天沒有度數資料！點擊前往新增。</span>
          </div>
        )}
      </div>

      <div className="dashboard-grid">
        <div className="card dashboard-card">
          <CircularProgress 
            value={metrics.usage} 
            max={metrics.budgetUsage || 1} 
            label="當期試算度數" 
            subLabel="預算度數"
          />
        </div>
        <div className="card dashboard-card">
          <CircularProgress 
            value={metrics.cost} 
            max={metrics.budgetCost || 1} 
            label="當期試算電費" 
            subLabel="預算電費"
            color="var(--info-color)"
            extraInfo={`(平均 $${(metrics.usage > 0 ? (metrics.cost / metrics.usage).toFixed(2) : "0.00")})`}
          />
        </div>
      </div>

      <div className="action-container">
        <button className="btn-primary" onClick={handleSettle}>
          結算
        </button>
        {isMissingEndReading && startDate && endDate && (
          <p className="error-text text-small text-center" style={{marginTop: '8px'}}>
            ⚠️ 結算日尚無指針紀錄
          </p>
        )}
      </div>
    </div>
  );
}
