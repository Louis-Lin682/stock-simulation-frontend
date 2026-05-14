import { API_BASE_URL } from '../constants'

export function translateApiMessage(message: string) {
  const dictionary: Record<string, string> = {
    'Invalid email or password': '帳號或密碼錯誤',
    'email is already registered': '這個 Email 已經註冊過了',
    'email and password are required': '未填寫帳號或密碼',
    'password must be at least 8 characters': '密碼至少需要 8 個字元',
    'Missing authorization token': '請先登入',
    'Invalid or expired authorization token': '登入狀態已失效，請重新登入',
    'Insufficient cash': '證券戶可用現金不足',
    'Insufficient stock quantity': '可賣股數不足',
    'Stock price not found': '找不到這檔股票的價格資料',
    'Stock not found': '找不到這檔股票',
    'symbol must be a Taiwan stock code': '台股代號格式不正確，例如 2330、0050、00400A',
    'symbol is not supported for this market': '此市場不支援這個股票代號格式',
    'market must be TW or US': '市場只能是 TW 或 US',
    'transfer amount must be greater than 0': '轉帳金額必須大於 0',
    'transfer direction is invalid': '轉帳方向不正確',
    'Insufficient bank cash': '銀行餘額不足',
    'Insufficient broker cash': '證券戶可用現金不足',
    'Failed to transfer cash': '轉帳失敗',
    'Failed to load cash transactions': '資金紀錄載入失敗',
    'Failed to fetch market calendar': '交易日曆載入失敗',
  }

  return dictionary[message] ?? message
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? translateApiMessage(error.message) : '發生未知錯誤'
}

export async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options)
  const data = (await response.json()) as unknown

  if (!response.ok) {
    const detail =
      typeof data === 'object' && data !== null && 'message' in data
        ? String(data.message)
        : '請求失敗'

    throw new Error(detail)
  }

  return data as T
}
