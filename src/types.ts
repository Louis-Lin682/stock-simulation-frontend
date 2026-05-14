export type AuthMode = 'login' | 'register'
export type Market = 'TW' | 'US'
export type OrderSide = 'BUY' | 'SELL'
export type OrderType = 'MARKET' | 'LIMIT'
export type OrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED'
export type DetailModal = 'holdings' | 'orders' | null
export type Currency = 'TWD' | 'USD'

export type AuthUser = {
  id: number
  email: string | null
  phone: string | null
  appleId: string | null
  createdAt: string
}

export type AuthResponse = {
  token: string
  user: AuthUser
}

export type Holding = {
  id: number
  market: Market
  currency: Currency
  symbol: string
  name: string
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  averageCost: number
  latestPrice: number | null
  costValue: number
  marketValue: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  createdAt: string
  updatedAt: string
}

export type CurrencyTotal = {
  currency: Currency
  cash: number
  bankCash: number
  reservedCash: number
  costValue: number
  marketValue: number
  totalValue: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  realizedPnL: number
  totalPnL: number
  totalReturnPercent: number
  cumulativeFee: number
  cumulativeTax: number
  pendingOrderCount: number
  pendingBuyAmount: number
  pendingSellQuantity: number
}

export type Portfolio = {
  cash: number
  costValue: number
  marketValue: number
  totalValue: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  bankAccounts?: Array<{
    currency: Currency
    cash: number
  }>
  totalsByCurrency?: CurrencyTotal[]
  holdings: Holding[]
}

export type CashTransaction = {
  id: number
  userId: number
  currency: Currency
  type: string
  amount: number
  bankCashBefore: number
  bankCashAfter: number
  brokerCashBefore: number
  brokerCashAfter: number
  note: string | null
  createdAt: string
}

export type TransferResponse = {
  account: {
    id: number
    userId: number | null
    currency: Currency
    cash: number
    reservedCash: number
    createdAt: string
    updatedAt: string
  }
  bankAccount: {
    id: number
    userId: number | null
    currency: Currency
    cash: number
    createdAt: string
    updatedAt: string
  }
  transaction: CashTransaction
}

export type StockQuote = {
  market?: Market
  currency?: Currency
  exchange?: string
  symbol: string
  name: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  change: number | null
  tradeVolume: number
  tradeValue: number
  transaction: number
}

export type StockListResponse = {
  count: number
  data: StockQuote[]
}

export type StockListItem = Pick<StockQuote, 'symbol' | 'name' | 'exchange' | 'close' | 'change' | 'tradeVolume'>

export type StockHistoryItem = {
  date: string
  close: number | null
  tradeVolume: number
}

export type StockHistoryResponse = {
  data: StockHistoryItem[]
}

export type MarketCalendar = {
  market: Market
  year: number
  source: string
  holidays: string[]
}

export type TradeOrder = {
  id: number
  userId: number
  market: Market
  currency: Currency
  symbol: string
  name: string
  side: OrderSide
  orderType: OrderType
  status: OrderStatus
  price: number
  limitPrice: number | null
  filledPrice: number | null
  quantity: number
  amount: number
  fee: number
  tax: number
  netAmount: number
  realizedPnL: number
  availableCashBefore: number | null
  availableCashAfter: number | null
  availableQuantityBefore: number | null
  availableQuantityAfter: number | null
  createdAt: string
  updatedAt: string
  filledAt: string | null
  cancelledAt: string | null
  effectiveDate?: string | null
  isNextSessionOrder?: boolean
}
