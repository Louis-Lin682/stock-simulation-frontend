import type { Currency, Market } from '../types'

export function formatCurrency(value: number, currency: Currency = 'TWD') {
  const formatted = new Intl.NumberFormat(currency === 'TWD' ? 'zh-TW' : 'en-US', {
    minimumFractionDigits: currency === 'TWD' ? 0 : 2,
    maximumFractionDigits: currency === 'TWD' ? 0 : 2,
  }).format(value)

  return `${currency} ${formatted}`
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-TW').format(value)
}

export function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-TW')
}

export function formatDateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('zh-TW')
}

export function getMarketLabel(market: Market) {
  return market === 'TW' ? '台股' : '美股'
}

export function getCurrencyForMarket(market: Market): Currency {
  return market === 'TW' ? 'TWD' : 'USD'
}
