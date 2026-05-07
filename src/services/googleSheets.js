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
/**
 * 從 Google Sheets 讀取現有資料
 */
export const fetchExistingBills = async (gasUrl) => {
  const url = `${gasUrl}?action=read`;
  let rawResponse = '';
  try {
    const response = await fetch(url);
    rawResponse = await response.text(); 
    
    if (!response.ok) throw new Error(`HTTP 錯誤: ${response.status} ${response.statusText}`);
    
    const result = JSON.parse(rawResponse);
    
    if (result.success && !Array.isArray(result.data)) {
      throw new Error('GAS 回傳格式錯誤：遺漏 data 陣列');
    }

    let bills = [];
    if (result.success && Array.isArray(result.data)) {
      bills = result.data.map(row => {
        const rawKey = row.billYearMonth || row['帳單年月'] || (Array.isArray(row) ? row[0] : null);
        // 確保 key 是字串且格式一致 (YYYY/M)
        const key = typeof rawKey === 'string' ? rawKey.trim() : String(rawKey || '');
        return { billYearMonth: key, ...row };
      }).filter(b => b.billYearMonth);
    }
    
    return {
      success: true,
      data: bills,
      debugInfo: {
        url,
        status: response.status,
        statusText: response.statusText,
        rawResponse,
        mappingResult: bills
      }
    };
  } catch (error) {
    console.error('讀取 Google Sheets 失敗:', error);
    return {
      success: false,
      message: error.message,
      debugInfo: {
        url,
        rawResponse,
        error: error.message
      }
    };
  }
};

/**
 * 同步資料到 Google Sheets (增量上傳)
 */
export const syncToGoogleSheets = async (gasUrl, localBills) => {
  if (!gasUrl) throw new Error('未設定 Web App URL');
  
  // 1. 獲取現有資料進行比對
  const fetchResult = await fetchExistingBills(gasUrl);
  if (!fetchResult.success) {
    return {
      success: false,
      message: `讀取雲端資料失敗: ${fetchResult.message}`,
      debugInfo: fetchResult.debugInfo
    };
  }
  const existingBills = fetchResult.data || [];
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
      
      // 確保所有欄位都有值，解決 undefined 問題
      return {
        '帳單年月': formatBillKey(bill.year, bill.month) || '',
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
    return { 
      success: true, 
      message: '資料已是最新，無需同步。', 
      skipped: true,
      debugInfo: fetchResult.debugInfo 
    };
  }

  // 3. 執行寫入
  let postRawResponse = '';
  try {
    const response = await fetch(gasUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'sync', // 使用使用者 GAS 定義的 action
        bills: newBills // 使用使用者 GAS 定義的 key
      }),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      }
    });

    postRawResponse = await response.text();
    
    if (!response.ok) {
      throw new Error(`同步請求失敗: ${response.status} ${response.statusText}`);
    }
    
    const result = JSON.parse(postRawResponse);
    return { 
      ...result, 
      count: newBills.length,
      debugInfo: {
        url: gasUrl,
        status: response.status,
        statusText: response.statusText,
        rawResponse: postRawResponse,
        mappingResult: newBills
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      debugInfo: {
        url: gasUrl,
        rawResponse: postRawResponse,
        error: error.message,
        mappingResult: newBills
      }
    };
  }
};
