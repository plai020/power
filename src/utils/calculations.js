import { differenceInDays, addDays, getMonth, getDate } from 'date-fns';

/**
 * Check if a date falls in the summer period (June 1 - Sept 30)
 */
export const isSummerDate = (date) => {
  const month = getMonth(date) + 1; // getMonth is 0-indexed
  const day = getDate(date);
  
  if (month > 6 && month < 9) return true; // July, August
  if (month === 6) return true; // June 1-30
  if (month === 9 && day <= 30) return true; // Sept 1-30
  return false;
};

/**
 * Calculate the electricity cost based on usage, dates, and price tiers.
 */
export const calculateElectricityCost = (usage, startDateStr, endDateStr, priceConfig) => {
  if (!usage || !startDateStr || !endDateStr || !priceConfig) return 0;
  
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (end < start) return 0;
  
  // Inclusive days
  const totalDays = differenceInDays(end, start) + 1;
  
  let summerDays = 0;
  let currentDate = start;
  
  for (let i = 0; i < totalDays; i++) {
    if (isSummerDate(currentDate)) {
      summerDays++;
    }
    currentDate = addDays(currentDate, 1);
  }
  
  const nonSummerDays = totalDays - summerDays;
  let totalCost = 0;
  
  for (const tier of priceConfig) {
    // Determine how much usage falls into this tier
    const tierUsage = Math.max(0, Math.min(usage, tier.max) - tier.min + 1);
    
    if (tierUsage > 0) {
      const summerCost = tierUsage * tier.summerRate * (summerDays / totalDays);
      const nonSummerCost = tierUsage * tier.nonSummerRate * (nonSummerDays / totalDays);
      totalCost += (summerCost + nonSummerCost);
    }
  }
  
  return Math.round(totalCost);
};

/**
 * Get total budget for a date range
 */
export const calculateBudgetForRange = (startDateStr, endDateStr, getBudgetForDate) => {
  if (!startDateStr || !endDateStr) return 0;
  
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (end < start) return 0;
  
  const totalDays = differenceInDays(end, start) + 1;
  let totalBudget = 0;
  let currentDate = start;
  
  for (let i = 0; i < totalDays; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    totalBudget += getBudgetForDate(dateStr);
    currentDate = addDays(currentDate, 1);
  }
  
  return totalBudget;
};

/**
 * Calculate daily usage map from an array of meter readings
 */
export const calculateDailyUsage = (meterReadings) => {
  const usageMap = {}; 
  if (!meterReadings || meterReadings.length < 2) return usageMap;

  // Sort ascending by date
  const sorted = [...meterReadings].sort((a, b) => new Date(a.date) - new Date(b.date));

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const prevDate = new Date(prev.date);
    const currDate = new Date(curr.date);
    const daysDiff = differenceInDays(currDate, prevDate);
    
    // Ignore negative or zero days just in case
    if (daysDiff > 0) {
      const diffUsage = parseInt(curr.reading, 10) - parseInt(prev.reading, 10);
      const avg = Math.floor(diffUsage / daysDiff);
      const remainder = diffUsage - (avg * daysDiff);

      let tempDate = addDays(prevDate, 1);
      for (let d = 1; d <= daysDiff; d++) {
        const dateStr = tempDate.toISOString().split('T')[0];
        let usage = avg;
        if (d === daysDiff) {
           usage += remainder;
        }
        usageMap[dateStr] = {
           usage,
           isEstimated: daysDiff > 1
        };
        tempDate = addDays(tempDate, 1);
      }
    }
  }
  return usageMap;
};
