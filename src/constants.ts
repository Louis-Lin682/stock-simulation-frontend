import type { StockQuote } from './types'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3001'
export const STOCK_LIST_BATCH_SIZE = 50
export const MOBILE_STOCK_LIST_BATCH_SIZE = 10

function createUsListFallback(symbol: string, name: string): StockQuote {
  return {
    market: 'US',
    currency: 'USD',
    exchange: 'US',
    symbol,
    name,
    open: null,
    high: null,
    low: null,
    close: null,
    change: null,
    tradeVolume: 0,
    tradeValue: 0,
    transaction: 0,
  }
}

export const US_STOCK_LIST: StockQuote[] = [
  createUsListFallback('NVDA', 'NVIDIA'),
  createUsListFallback('AAPL', 'Apple'),
  createUsListFallback('TSLA', 'Tesla'),
  createUsListFallback('MSFT', 'Microsoft'),
  createUsListFallback('AMD', 'AMD'),
]
