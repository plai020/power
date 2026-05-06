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
    
    // 確保回傳的是陣列，並且過濾掉無效資料
    if (result.success && Array.isArray(result.data)) {
      return result.data.filter(b => b && (b.billYearMonth || b['帳單年月']));
    }
    return [];
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
  
  // 支援多種 Key 格式 (英文或中文標頭)
  const existingKeys = new Set(
    existingBills.map(b => b.billYearMonth || b['帳單年月']).filter(Boolean)
  );

  // 2. 過濾出尚未上傳的資料，並按照使用者要求的 9 個欄位對應
  const newBills = (localBills || [])
    .filter(bill => {
      const key = formatBillKey(bill.year, bill.month);
      return !existingKeys.has(key);
    })
    .map(bill => {
      const actualUsageNum = parseFloat(bill.actualUsage) || 0;
      const actualCostNum = parseFloat(bill.actualCost) || 0;
      const avgPrice = actualUsageNum > 0 ? (actualCostNum / actualUsageNum).toFixed(2) : '0.00';
      
      // 精確對應使用者指定的 9 個欄位順序與名稱
      return {
        billYearMonth: formatBillKey(bill.year, bill.month), // 1. 帳單年月
        startDate: bill.startDate || '',                     // 2. 帳單起算日
        endDate: bill.endDate || '',                         // 3. 帳單結算日
        calcUsage: bill.calculatedUsage || 0,                // 4. 試算度數
        calcCost: bill.calculatedCost || 0,                  // 5. 試算電費
        actualUsage: actualUsageNum,                         // 6. 實際度數
        actualCost: actualCostNum,                           // 7. 實際電費
        avgPrice: parseFloat(avgPrice),                      // 8. 平均 (數值格式)
        remark: bill.note || ''                               // 9. 備註
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
