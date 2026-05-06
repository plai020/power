/**
 * Google Sheets 同步服務
 */

/**
 * 格式化年月為唯一鍵 (YYYY-MM)
 */
export const formatBillKey = (year, month) => {
  return `${year}-${month.toString().padStart(2, '0')}`;
};

/**
 * 從 Google Sheets 讀取現有資料
 * 假設 GAS 支援 ?action=read
 */
export const fetchExistingBills = async (gasUrl) => {
  try {
    const response = await fetch(`${gasUrl}?action=read`);
    if (!response.ok) throw new Error('無法讀取遠端資料');
    const result = await response.json();
    return result.success ? result.data : [];
  } catch (error) {
    console.error('讀取 Google Sheets 失敗:', error);
    return [];
  }
};

/**
 * 同步資料到 Google Sheets (增量上傳)
 */
export const syncToGoogleSheets = async (gasUrl, localBills) => {
  if (!gasUrl) throw new Error('未設定 Web App URL');
  
  // 1. 獲取現有資料進行比對
  const existingBills = await fetchExistingBills(gasUrl);
  const existingKeys = new Set(existingBills.map(b => b.billYearMonth));

  // 2. 過濾出尚未上傳的資料，並準備上傳格式
  const newBills = localBills
    .filter(bill => !existingKeys.has(formatBillKey(bill.year, bill.month)))
    .map(bill => {
      const actualUsageNum = parseFloat(bill.actualUsage) || 0;
      const actualCostNum = parseFloat(bill.actualCost) || 0;
      const avgPrice = actualUsageNum > 0 ? (actualCostNum / actualUsageNum).toFixed(2) : '0.00';
      
      return {
        billYearMonth: formatBillKey(bill.year, bill.month),
        year: bill.year,
        month: bill.month,
        startDate: bill.startDate,
        endDate: bill.endDate,
        calcUsage: bill.calculatedUsage,
        calcCost: bill.calculatedCost,
        actualUsage: bill.actualUsage || 0,
        actualCost: bill.actualCost || 0,
        avgPrice: avgPrice, // 新增欄位
        remark: bill.note || '' // 新增欄位 (對應 App 內的備註)
      };
    });

  if (newBills.length === 0) {
    return { success: true, message: '資料已是最新，無需同步。', skipped: true };
  }

  // 3. 執行上傳 (action=write)
  const response = await fetch(gasUrl, {
    method: 'POST',
    body: JSON.stringify({
      action: 'write',
      data: newBills
    }),
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    }
  });

  if (!response.ok) throw new Error('網路回應錯誤');
  const result = await response.json();
  return { ...result, count: newBills.length };
};
