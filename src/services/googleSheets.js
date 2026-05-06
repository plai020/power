/**
 * Google Sheets 同步服務 (徹底重構版)
 * 統一格式：YYYY/M (例如 2026/5)
 */

/**
 * 格式化年月為唯一鍵 (需與 App 統計頁面 YYYY/M 一致)
 */
export const formatBillKey = (year, month) => {
  if (!year || !month) return '';
  return `${year}/${month}`;
};

/**
 * 從 Google Sheets 讀取現有資料
 */
export const fetchExistingBills = async (gasUrl) => {
  try {
    const response = await fetch(`${gasUrl}?action=read`);
    if (!response.ok) throw new Error('無法讀取遠端資料');
    const result = await response.json();
    
    if (result.success && Array.isArray(result.data)) {
      // 確保回傳資料有效，並統一讀取第一欄 (帳單年月)
      return result.data.map(row => {
        // 相容於物件格式或陣列格式
        const key = row.billYearMonth || row['帳單年月'] || (Array.isArray(row) ? row[0] : null);
        return { billYearMonth: key, ...row };
      }).filter(b => b.billYearMonth);
    }
    return [];
  } catch (error) {
    console.error('讀取 Google Sheets 失敗:', error);
    return [];
  }
};

/**
 * 同步資料到 Google Sheets (增量上傳)
 * 嚴格對應 9 個欄位：
 * 0: 帳單年月, 1: 帳單起算日, 2: 帳單結算日, 3: 試算度數, 4: 試算電費, 
 * 5: 實際度數, 6: 實際電費, 7: 平均, 8: 備註
 */
export const syncToGoogleSheets = async (gasUrl, localBills) => {
  if (!gasUrl) throw new Error('未設定 Web App URL');
  
  // 1. 獲取現有資料進行比對
  const existingBills = await fetchExistingBills(gasUrl);
  const existingKeys = new Set(existingBills.map(b => b.billYearMonth));

  // 2. 準備增量資料
  const newBills = (localBills || [])
    .filter(bill => {
      const key = formatBillKey(bill.year, bill.month);
      return key && !existingKeys.has(key);
    })
    .map(bill => {
      const actualUsageNum = parseFloat(bill.actualUsage) || 0;
      const actualCostNum = parseFloat(bill.actualCost) || 0;
      const avgPrice = actualUsageNum > 0 ? (actualCostNum / actualUsageNum).toFixed(2) : '0.00';
      
      // 依照順序建構資料 (GAS 端建議依據 Key 寫入，此處輸出標準物件)
      return {
        '帳單年月': formatBillKey(bill.year, bill.month),
        '帳單起算日': bill.startDate || '',
        '帳單結算日': bill.endDate || '',
        '試算度數': bill.calculatedUsage || 0,
        '試算電費': bill.calculatedCost || 0,
        '實際度數': actualUsageNum,
        '實際電費': actualCostNum,
        '平均': parseFloat(avgPrice),
        '備註': bill.note || ''
      };
    });

  if (newBills.length === 0) {
    return { success: true, message: '資料已是最新，無需同步。', skipped: true };
  }

  // 3. 執行寫入
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

  if (!response.ok) throw new Error('同步請求失敗');
  const result = await response.json();
  return { ...result, count: newBills.length };
};
