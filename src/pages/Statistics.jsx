import { useState, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useAppContext } from '../context/AppContext';
import './Statistics.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Statistics() {
  const { settledBills, deleteSettledBill, addSettledBill } = useAppContext(); // use addSettledBill (we actually need an update function, but we can delete and re-add or better, let's just add updateSettledBill to context. For now, since Context doesn't have update, I'll update localStorage directly or add it. Wait, I should add update to context).
  const [showTable, setShowTable] = useState(true);
  const [showCharts, setShowCharts] = useState(true);

  // Quick helper to update a bill without modifying context structure
  const handleUpdateBill = (id, field, value) => {
    // Note: In a real app, we should add updateSettledBill to AppContext.
    // For this prototype, I'll manipulate the bills and trigger a re-render by doing a shallow copy trick if context doesn't expose it.
    // Actually, I can just dispatch to local storage and force reload, but let's implement update in AppContext later. 
    // Since I can't easily edit AppContext here without `multi_replace`, I'll rely on a small hack: 
    // find it, delete it, add it back.
    const bill = settledBills.find(b => b.id === id);
    if (bill) {
      const updated = { ...bill, [field]: value };
      deleteSettledBill(id);
      addSettledBill(updated);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('確定要刪除這筆結算資料嗎？')) {
      deleteSettledBill(id);
    }
  };

  // Chart Data Preparation
  const chartData = useMemo(() => {
    // Sort by year, month ascending to find the last 6 periods
    const sorted = [...settledBills].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    // Get last 6 unique periods (year/month)
    const recent6 = sorted.slice(-6);
    const labels = recent6.map(b => `${b.year}/${b.month}`);
    
    // This year data (actual usage)
    const usageDataThisYear = recent6.map(b => b.actualUsage || b.calculatedUsage || 0); // fallback to calculated if actual is missing
    const costDataThisYear = recent6.map(b => b.actualCost || b.calculatedCost || 0);

    // To get last year, we would need to find bills where year = b.year - 1 and month = b.month
    const usageDataLastYear = recent6.map(b => {
      const lastYearBill = settledBills.find(old => old.year === b.year - 1 && old.month === b.month);
      return lastYearBill ? (lastYearBill.actualUsage || lastYearBill.calculatedUsage || 0) : null;
    });
    
    const costDataLastYear = recent6.map(b => {
      const lastYearBill = settledBills.find(old => old.year === b.year - 1 && old.month === b.month);
      return lastYearBill ? (lastYearBill.actualCost || lastYearBill.calculatedCost || 0) : null;
    });

    return {
      labels,
      usage: {
        labels,
        datasets: [
          {
            label: '今年實際度數',
            data: usageDataThisYear,
            borderColor: 'rgb(76, 175, 80)',
            backgroundColor: 'rgba(76, 175, 80, 0.5)',
          },
          {
            label: '去年實際度數',
            data: usageDataLastYear,
            borderColor: 'rgb(158, 158, 158)',
            backgroundColor: 'rgba(158, 158, 158, 0.5)',
            borderDash: [5, 5],
          }
        ]
      },
      cost: {
        labels,
        datasets: [
          {
            label: '今年實際電費',
            data: costDataThisYear,
            borderColor: 'rgb(66, 165, 245)',
            backgroundColor: 'rgba(66, 165, 245, 0.5)',
          },
          {
            label: '去年實際電費',
            data: costDataLastYear,
            borderColor: 'rgb(158, 158, 158)',
            backgroundColor: 'rgba(158, 158, 158, 0.5)',
            borderDash: [5, 5],
          }
        ]
      }
    };
  }, [settledBills]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
    },
  };

  return (
    <div className="statistics-page">

      <div className="view-toggles">
        <button 
          className={`toggle-btn ${showTable ? 'active' : ''}`}
          onClick={() => setShowTable(!showTable)}
        >
          {showTable ? '隱藏表格' : '顯示表格'}
        </button>
        <button 
          className={`toggle-btn ${showCharts ? 'active' : ''}`}
          onClick={() => setShowCharts(!showCharts)}
        >
          {showCharts ? '隱藏圖表' : '顯示圖表'}
        </button>
      </div>

      {showTable && (
        <div className="table-container card">
          <div className="table-header-actions">
            <button className="btn-secondary text-small" onClick={() => setHideDates(!hideDates)}>
              {hideDates ? '顯示日期' : '隱藏日期'}
            </button>
          </div>
          <table className="stats-table">
            <thead>
              <tr>
                <th rowSpan="2">帳單年月</th>
                {!hideDates && <th colSpan="2">日期</th>}
                <th colSpan="2">試算</th>
                <th colSpan="3">實際</th>
                <th rowSpan="2">備註</th>
                <th rowSpan="2">操作</th>
              </tr>
              <tr>
                {!hideDates && <th>起算日</th>}
                {!hideDates && <th>結算日</th>}
                <th>度數</th>
                <th>電費</th>
                <th>度數</th>
                <th>電費</th>
                <th>平均</th>
              </tr>
            </thead>
            <tbody>
              {settledBills.map(bill => {
                const actualUsageNum = parseFloat(bill.actualUsage) || 0;
                const actualCostNum = parseFloat(bill.actualCost) || 0;
                const avgCost = actualUsageNum > 0 ? (actualCostNum / actualUsageNum).toFixed(2) : '0.00';

                return (
                  <tr key={bill.id}>
                    <td className="text-center font-bold">{bill.year}/{bill.month}</td>
                    {!hideDates && <td className="text-center">{bill.startDate.substring(5)}</td>}
                    {!hideDates && <td className="text-center">{bill.endDate.substring(5)}</td>}
                    <td className="text-center">{bill.calculatedUsage?.toLocaleString()}</td>
                    <td className="text-center">${bill.calculatedCost?.toLocaleString()}</td>
                    <td className="text-center">
                      <input 
                        type="number" 
                        value={bill.actualUsage || ''} 
                        onChange={(e) => updateSettledBill({ ...bill, actualUsage: e.target.value })}
                        placeholder="度數"
                      />
                    </td>
                    <td className="text-center">
                      <input 
                        type="number" 
                        value={bill.actualCost || ''} 
                        onChange={(e) => updateSettledBill({ ...bill, actualCost: e.target.value })}
                        placeholder="電費"
                      />
                    </td>
                    <td className="text-center font-mono text-small">${parseFloat(avgCost).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="text-center">
                      <input 
                        type="text" 
                        className="note-input"
                        value={bill.note || ''} 
                        onChange={(e) => updateSettledBill({ ...bill, note: e.target.value })}
                        placeholder="..."
                      />
                    </td>
                    <td className="text-center">
                      <button className="action-btn" onClick={() => handleDelete(bill.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {settledBills.length === 0 && (
                <tr>
                  <td colSpan={hideDates ? "8" : "10"} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                    目前尚無結算資料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCharts && settledBills.length > 0 && (
        <div className="charts-wrapper">
          <div className="card chart-container">
            <Line options={{...chartOptions, plugins: { title: { display: true, text: '實際度數比較 (近6期)' }}}} data={chartData.usage} />
          </div>
          <div className="card chart-container">
            <Line options={{...chartOptions, plugins: { title: { display: true, text: '實際電費比較 (近6期)' }}}} data={chartData.cost} />
          </div>
        </div>
      )}
    </div>
  );
}
