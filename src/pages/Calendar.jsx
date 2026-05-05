import { useState, useMemo } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Calculator } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { calculateDailyUsage, calculateElectricityCost } from '../utils/calculations';
import './Calendar.css';

const DAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function CalendarPage() {
  const { meterReadings, periodDates, getBudgetForDate, addMeterReading, deleteMeterReading } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ date: '', time: '12:00', reading: '', note: '' });

  // Calculator State
  const [calcData, setCalcData] = useState({ startDate: '', endDate: '', usage: '' });
  const [calcResult, setCalcResult] = useState(null);

  const usageMap = useMemo(() => calculateDailyUsage(meterReadings), [meterReadings]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleYearChange = (e) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(parseInt(e.target.value));
    setCurrentDate(newDate);
  };
  const handleMonthChange = (e) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(parseInt(e.target.value));
    setCurrentDate(newDate);
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDateGrid = startOfWeek(monthStart);
    const endDateGrid = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDateGrid;

    while (day <= endDateGrid) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = new Date(day);
        const dateStr = format(cloneDay, 'yyyy-MM-dd');
        
        const isCurrentMonth = isSameMonth(cloneDay, monthStart);
        const isStart = dateStr === periodDates.startDate;
        const isEnd = dateStr === periodDates.endDate;
        const hasReading = meterReadings.some(r => r.date === dateStr);
        
        const usageData = usageMap[dateStr];
        const budget = getBudgetForDate(dateStr);
        const isOverBudget = usageData && usageData.usage > budget;

        let cellClasses = `calendar-cell ${isCurrentMonth ? '' : 'other-month'}`;
        if (isStart) cellClasses += ' is-start';
        if (isEnd) cellClasses += ' is-end';
        if (isOverBudget) cellClasses += ' over-budget';

        days.push(
          <div 
            className={cellClasses} 
            key={day}
            onClick={() => handleCellClick(dateStr)}
          >
            <span className="cell-date">{format(cloneDay, 'd')}</span>
            {usageData && (
              <span className={`cell-usage ${isOverBudget ? 'over-budget-text' : ''}`}>
                +{usageData.usage}
              </span>
            )}
            {hasReading && <div className="dot-indicator"></div>}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="calendar-grid" key={day}>{days}</div>);
      days = [];
    }
    return rows;
  };

  const handleCellClick = (dateStr) => {
    const existing = meterReadings.find(r => r.date === dateStr);
    if (existing) {
      setFormData(existing);
      setIsEditing(true);
    } else {
      const now = new Date();
      setFormData({ 
        date: dateStr, 
        time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`, 
        reading: '', 
        note: '' 
      });
      setIsEditing(false);
    }
    setShowModal(true);
  };

  const handleAddClick = () => {
    const now = new Date();
    setFormData({ 
      date: format(now, 'yyyy-MM-dd'), 
      time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`, 
      reading: '', 
      note: '' 
    });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.date || !formData.reading) {
      alert('日期與電錶指針為必填！');
      return;
    }
    addMeterReading({
      ...formData,
      reading: parseInt(formData.reading, 10)
    });
    setShowModal(false);
  };

  const handleCalcSubmit = (e) => {
    e.preventDefault();
    const { startDate, endDate, usage } = calcData;
    if (!startDate || !endDate || !usage) return;
    const cost = calculateElectricityCost(parseInt(usage), startDate, endDate, priceConfig);
    setCalcResult(cost);
  };

  const handleCalcClick = () => {
    setCalcData({ startDate: '', endDate: '', usage: '' });
    setCalcResult(null);
    setShowCalcModal(true);
  };

  return (
    <div className="calendar-page">
      <div className="calendar-header card" style={{ padding: '10px 20px', marginBottom: 0 }}>
        <button onClick={handlePrevMonth}><ChevronLeft /></button>
        <div className="calendar-controls">
          <select value={currentDate.getFullYear()} onChange={handleYearChange}>
            {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <select value={currentDate.getMonth()} onChange={handleMonthChange}>
            {Array.from({ length: 12 }, (_, i) => i).map(m => (
              <option key={m} value={m}>{m + 1}月</option>
            ))}
          </select>
        </div>
        <button onClick={handleNextMonth}><ChevronRight /></button>
      </div>

      <div className="card" style={{ padding: '10px' }}>
        <div className="calendar-grid">
          {DAYS.map(day => (
            <div className="calendar-day-header" key={day}>{day}</div>
          ))}
        </div>
        {renderCells()}
      </div>

      <div className="fab-group">
        <button className="fab-button calc-fab" onClick={handleCalcClick}>
          <Calculator size={28} />
        </button>
        <button className="fab-button add-fab" onClick={handleAddClick}>
          <Plus size={32} />
        </button>
      </div>

      {showCalcModal && (
        <div className="modal-overlay" onClick={() => setShowCalcModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>試算電費 (不儲存)</h2>
              <button className="close-btn" onClick={() => setShowCalcModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form className="modal-form" onSubmit={handleCalcSubmit}>
              <div className="form-group">
                <label>起算日</label>
                <input 
                  type="date" 
                  required
                  value={calcData.startDate}
                  onChange={e => setCalcData({...calcData, startDate: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>結算日</label>
                <input 
                  type="date" 
                  required
                  value={calcData.endDate}
                  onChange={e => setCalcData({...calcData, endDate: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>使用度數</label>
                <input 
                  type="number" 
                  required
                  placeholder="輸入度數"
                  value={calcData.usage}
                  onChange={e => setCalcData({...calcData, usage: e.target.value})}
                />
              </div>
              
              <button type="submit" className="btn-primary" style={{marginTop: '10px'}}>
                開始試算
              </button>

              {calcResult !== null && (
                <div className="calc-result-box">
                  <div className="result-label">試算電費結果：</div>
                  <div className="result-value">${calcResult}</div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isEditing ? '編輯紀錄' : '新增紀錄'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>日期 *</label>
                <input 
                  type="date" 
                  required
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  disabled={isEditing} // 編輯時不允許改日期，因為一天只有一筆
                />
              </div>
              <div className="form-group">
                <label>時間</label>
                <input 
                  type="time" 
                  value={formData.time}
                  onChange={e => setFormData({...formData, time: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>電錶指針 (整數) *</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  step="1"
                  value={formData.reading}
                  onChange={e => setFormData({...formData, reading: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>備註</label>
                <input 
                  type="text" 
                  value={formData.note}
                  onChange={e => setFormData({...formData, note: e.target.value})}
                />
              </div>
              
              <div className="modal-actions">
                {isEditing && (
                  <button type="button" className="btn-danger" onClick={handleDelete}>
                    <Trash2 size={20} />
                  </button>
                )}
                <button type="submit" className="btn-primary btn-submit">
                  儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
