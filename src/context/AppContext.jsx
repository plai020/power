import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

// Mock Price Config based on user's image
const defaultPriceConfig = [
  { min: 1, max: 240, summerRate: 1.78, nonSummerRate: 1.78 },
  { min: 241, max: 660, summerRate: 2.55, nonSummerRate: 2.26 },
  { min: 661, max: 1000, summerRate: 3.8, nonSummerRate: 3.13 },
  { min: 1001, max: 1400, summerRate: 5.14, nonSummerRate: 4.24 },
  { min: 1401, max: 2000, summerRate: 6.44, nonSummerRate: 5.27 },
  { min: 2001, max: Infinity, summerRate: 8.86, nonSummerRate: 7.03 }
];

export const AppProvider = ({ children }) => {
  const [meterReadings, setMeterReadings] = useState(() => {
    const saved = localStorage.getItem('meterReadings');
    return saved ? JSON.parse(saved) : [];
  });

  const [settledBills, setSettledBills] = useState(() => {
    const saved = localStorage.getItem('settledBills');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('settings');
    return saved ? JSON.parse(saved) : { gasUrl: '' };
  });

  const [periodDates, setPeriodDates] = useState(() => {
    const saved = localStorage.getItem('periodDates');
    return saved ? JSON.parse(saved) : { startDate: '', endDate: '' };
  });

  // Mock remote data for now
  const [priceConfig, setPriceConfig] = useState(defaultPriceConfig);
  
  // For budget, we'll use a fallback of 10 if not found in this array, but let's mock some
  const [budgetData, setBudgetData] = useState([]);

  useEffect(() => {
    localStorage.setItem('meterReadings', JSON.stringify(meterReadings));
  }, [meterReadings]);

  useEffect(() => {
    localStorage.setItem('settledBills', JSON.stringify(settledBills));
  }, [settledBills]);

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('periodDates', JSON.stringify(periodDates));
  }, [periodDates]);

  const addMeterReading = (reading) => {
    setMeterReadings(prev => {
      // Remove any existing reading for the same date to enforce 1 per day
      const filtered = prev.filter(r => r.date !== reading.date);
      // Sort by date descending
      return [...filtered, reading].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
  };

  const deleteMeterReading = (date) => {
    setMeterReadings(prev => prev.filter(r => r.date !== date));
  };

  const addSettledBill = (bill) => {
    setSettledBills(prev => [bill, ...prev]);
  };

  const deleteSettledBill = (id) => {
    setSettledBills(prev => prev.filter(b => b.id !== id));
  };

  const getBudgetForDate = (dateStr) => {
    const found = budgetData.find(b => b.date === dateStr);
    return found ? found.budget : 10; // default 10 per day as per image if not found
  };

  const value = {
    meterReadings,
    addMeterReading,
    deleteMeterReading,
    settledBills,
    addSettledBill,
    deleteSettledBill,
    settings,
    setSettings,
    periodDates,
    setPeriodDates,
    priceConfig,
    getBudgetForDate
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
