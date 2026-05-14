import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, UIEvent } from 'react'
import { AuthPanel } from './components/AuthPanel'
import { CashHistoryModal } from './components/CashHistoryModal'
import { ChartPanel } from './components/ChartPanel'
import { DetailModal } from './components/DetailModal'
import { LoadingRing } from './components/LoadingRing'
import { MarketCalendarModal } from './components/MarketCalendarModal'
import {
  MobileAccountPanel,
  MobileBottomNav,
  MobileHoldingsPanel,
  MobileOrdersPanel,
  type MobileView,
} from './components/MobileDashboardPanels'
import { OrderPanel } from './components/OrderPanel'
import { StockListPanel } from './components/StockListPanel'
import { SummaryCards } from './components/SummaryCards'
import { MOBILE_STOCK_LIST_BATCH_SIZE, STOCK_LIST_BATCH_SIZE, US_STOCK_LIST } from './constants'
import { useLoadingProgress } from './hooks/useLoadingProgress'
import type {
  AuthMode,
  AuthResponse,
  AuthUser,
  CashTransaction,
  CurrencyTotal,
  DetailModal as DetailModalState,
  Market,
  MarketCalendar,
  OrderSide,
  OrderType,
  Portfolio,
  StockHistoryItem,
  StockHistoryResponse,
  StockListItem,
  StockListResponse,
  StockQuote,
  TradeOrder,
  TransferResponse,
} from './types'
import { fetchJson, getErrorMessage } from './utils/api'
import { getCurrencyForMarket } from './utils/format'
import './App.css'

function isValidSymbolForMarket(market: Market, symbol: string) {
  return market === 'TW' ? /^[0-9A-Z]{4,8}$/.test(symbol) : /^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)
}

function normalizeOrderPrice(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

function formatOrderPriceInput(value: number) {
  return normalizeOrderPrice(value).toFixed(2)
}

function roundCurrency(currency: 'TWD' | 'USD', value: number) {
  if (currency === 'TWD') return Math.round(value)
  return Math.round(value * 100) / 100
}

function isTaiwanEtf(symbol: string) {
  return symbol.startsWith('00')
}

function isMobileViewport() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 720px)').matches
}

function getStockListBatchSize(isMobileLayout: boolean) {
  return isMobileLayout ? MOBILE_STOCK_LIST_BATCH_SIZE : STOCK_LIST_BATCH_SIZE
}

function calculateEstimatedTradeCost(
  market: Market,
  currency: 'TWD' | 'USD',
  symbol: string,
  side: OrderSide,
  amount: number,
) {
  const fee =
    market === 'TW'
      ? roundCurrency(currency, Math.max(20, amount * 0.001425))
      : roundCurrency(currency, Math.max(1, amount * 0.001))

  const tax =
    market === 'TW' && side === 'SELL'
      ? roundCurrency(currency, amount * (isTaiwanEtf(symbol) ? 0.001 : 0.003))
      : 0

  const netAmount = side === 'BUY' ? amount + fee + tax : amount - fee - tax

  return {
    fee,
    tax,
    netAmount: roundCurrency(currency, netAmount),
  }
}

function buildFallbackTotals(
  currency: 'TWD' | 'USD',
  market: Market,
  portfolio: Portfolio | null,
): CurrencyTotal {
  const isTaiwanMarket = market === 'TW'

  return {
    currency,
    cash: isTaiwanMarket ? (portfolio?.cash ?? 0) : 0,
    bankCash: portfolio?.bankAccounts?.find((item) => item.currency === currency)?.cash ?? 0,
    reservedCash: 0,
    costValue: isTaiwanMarket ? (portfolio?.costValue ?? 0) : 0,
    marketValue: isTaiwanMarket ? (portfolio?.marketValue ?? 0) : 0,
    totalValue: isTaiwanMarket ? (portfolio?.totalValue ?? 0) : 0,
    unrealizedPnL: isTaiwanMarket ? (portfolio?.unrealizedPnL ?? 0) : 0,
    unrealizedPnLPercent: isTaiwanMarket ? (portfolio?.unrealizedPnLPercent ?? 0) : 0,
    realizedPnL: 0,
    totalPnL: isTaiwanMarket ? (portfolio?.unrealizedPnL ?? 0) : 0,
    totalReturnPercent: 0,
    cumulativeFee: 0,
    cumulativeTax: 0,
    pendingOrderCount: 0,
    pendingBuyAmount: 0,
    pendingSellQuantity: 0,
  }
}

function App() {
  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState<string | null>(storedToken)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([])
  const [orders, setOrders] = useState<TradeOrder[]>([])
  const [twStocks, setTwStocks] = useState<StockQuote[]>([])
  const [usStocks, setUsStocks] = useState<StockQuote[]>(US_STOCK_LIST)
  const [selectedMarket, setSelectedMarket] = useState<Market>('TW')
  const [activeMarket, setActiveMarket] = useState<Market>('TW')
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [symbolInput, setSymbolInput] = useState('')
  const [isMobileLayout, setIsMobileLayout] = useState(isMobileViewport)
  const [visibleStockCount, setVisibleStockCount] = useState(() =>
    getStockListBatchSize(isMobileViewport()),
  )
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [history, setHistory] = useState<StockHistoryItem[]>([])
  const [orderSide, setOrderSide] = useState<OrderSide>('BUY')
  const [orderType, setOrderType] = useState<OrderType>('MARKET')
  const [limitPrice, setLimitPrice] = useState(0)
  const [limitPriceInput, setLimitPriceInput] = useState('')
  const [quantity, setQuantity] = useState(100)
  const [detailModal, setDetailModal] = useState<DetailModalState>(null)
  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null)
  const [transferCurrency, setTransferCurrency] = useState<'TWD' | 'USD'>('TWD')
  const [transferDirection, setTransferDirection] = useState<
    'BANK_TO_BROKER' | 'BROKER_TO_BANK'
  >('BANK_TO_BROKER')
  const [transferAmountInput, setTransferAmountInput] = useState('')
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isTransferLoading, setIsTransferLoading] = useState(false)
  const [isCashHistoryOpen, setIsCashHistoryOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isCalendarLoading, setIsCalendarLoading] = useState(false)
  const [marketCalendars, setMarketCalendars] = useState<Partial<Record<Market, MarketCalendar>>>(
    {},
  )
  const [mobileView, setMobileView] = useState<MobileView>('market')
  const [mobileAccountMarket, setMobileAccountMarket] = useState<Market>('TW')
  const [message, setMessage] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null)
  const [isQuoteLoading, setIsQuoteLoading] = useState(false)
  const [isRestoringSession, setIsRestoringSession] = useState(() => Boolean(storedToken))
  const [isInitialDashboardLoading, setIsInitialDashboardLoading] = useState(() => Boolean(storedToken))
  const [isStockListLoading, setIsStockListLoading] = useState<Record<Market, boolean>>({
    TW: false,
    US: false,
  })

  const authModeLabel = mode === 'login' ? '登入' : '建立帳戶'
  const switchLabel = mode === 'login' ? '建立帳戶' : '返回登入'
  const isSignedIn = Boolean(token && user)
  const holdings = portfolio?.holdings ?? []
  const stockListBatchSize = getStockListBatchSize(isMobileLayout)
  const selectedCurrency = getCurrencyForMarket(selectedMarket)
  const mobileAccountCurrency = getCurrencyForMarket(mobileAccountMarket)

  const selectedTotals = useMemo(
    () =>
      portfolio?.totalsByCurrency?.find((item) => item.currency === selectedCurrency) ??
      buildFallbackTotals(selectedCurrency, selectedMarket, portfolio),
    [portfolio, selectedCurrency, selectedMarket],
  )

  const mobileAccountTotals = useMemo(
    () =>
      portfolio?.totalsByCurrency?.find((item) => item.currency === mobileAccountCurrency) ??
      buildFallbackTotals(mobileAccountCurrency, mobileAccountMarket, portfolio),
    [mobileAccountCurrency, mobileAccountMarket, portfolio],
  )

  const activeCalendar = marketCalendars[activeMarket] ?? null

  const openAuthDialog = useCallback((nextMode: AuthMode = 'login', nextMessage = '') => {
    setMode(nextMode)
    if (nextMode === 'register') {
      setEmail('')
    }
    setPassword('')
    setAuthMessage(nextMessage)
    setIsAuthDialogOpen(true)
  }, [])

  const closeAuthDialog = useCallback(() => {
    setIsAuthDialogOpen(false)
    setAuthMessage('')
  }, [])

  const handleMobileViewChange = useCallback((nextView: MobileView) => {
    setIsCashHistoryOpen(false)
    setIsCalendarOpen(false)
    setMobileView(nextView)
  }, [])

  const chartData = useMemo(
    () =>
      history
        .filter((item) => item.close !== null)
        .map((item) => ({
          date: item.date.slice(5),
          close: item.close ?? 0,
        })),
    [history],
  )

  const filteredStocks = useMemo(() => {
    const keyword = symbolInput.trim().toUpperCase()
    const source: StockListItem[] = selectedMarket === 'TW' ? twStocks : usStocks

    if (!keyword) return source

    const exactMatches = source.filter((stock) => stock.symbol.toUpperCase() === keyword)
    if (exactMatches.length > 0) return exactMatches

    return source.filter((stock) => {
      const symbol = stock.symbol.toUpperCase()
      const name = stock.name.toUpperCase()
      return symbol.includes(keyword) || name.includes(keyword)
    })
  }, [selectedMarket, symbolInput, twStocks, usStocks])

  const visibleStocks = useMemo(
    () => filteredStocks.slice(0, visibleStockCount),
    [filteredStocks, visibleStockCount],
  )

  const parsedLimitPrice = Number(limitPriceInput)
  const activeLimitPrice = Number.isFinite(parsedLimitPrice) ? parsedLimitPrice : limitPrice
  const estimatedPrice = normalizeOrderPrice(
    orderType === 'LIMIT' ? activeLimitPrice : (quote?.close ?? 0),
  )
  const estimatedAmount = estimatedPrice * quantity
  const estimatedCost = calculateEstimatedTradeCost(
    activeMarket,
    selectedCurrency,
    selectedSymbol,
    orderSide,
    estimatedAmount,
  )

  const authProgress = useLoadingProgress(isLoading)
  const orderProgress = useLoadingProgress(isSubmittingOrder)
  const quoteProgress = useLoadingProgress(isQuoteLoading)
  const sessionProgress = useLoadingProgress(isRestoringSession || isInitialDashboardLoading)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 720px)')

    function handleViewportChange() {
      const nextIsMobile = query.matches
      setIsMobileLayout(nextIsMobile)
      setVisibleStockCount(getStockListBatchSize(nextIsMobile))
    }

    handleViewportChange()
    query.addEventListener('change', handleViewportChange)

    return () => {
      query.removeEventListener('change', handleViewportChange)
    }
  }, [])

  const loadPortfolio = useCallback(async (nextToken: string) => {
    const data = await fetchJson<Portfolio>('/api/portfolio', {
      headers: {
        Authorization: `Bearer ${nextToken}`,
      },
    })

    setPortfolio(data)
  }, [])

  const loadOrders = useCallback(async (nextToken: string) => {
    const data = await fetchJson<TradeOrder[]>('/api/orders', {
      headers: {
        Authorization: `Bearer ${nextToken}`,
      },
    })

    setOrders(data)
  }, [])

  const loadCashTransactions = useCallback(async (nextToken: string) => {
    const data = await fetchJson<CashTransaction[]>('/api/portfolio/cash-transactions?limit=100', {
      headers: {
        Authorization: `Bearer ${nextToken}`,
      },
    })

    setCashTransactions(data)
  }, [])

  const refreshAccount = useCallback(
    async (nextToken = token) => {
      if (!nextToken) return

      await Promise.all([
        loadOrders(nextToken),
        loadPortfolio(nextToken),
        loadCashTransactions(nextToken),
      ])
    },
    [loadCashTransactions, loadOrders, loadPortfolio, token],
  )

  const loadMarketCalendar = useCallback(
    async (market: Market) => {
      const year = new Date().getFullYear()
      const cachedCalendar = marketCalendars[market]

      if (cachedCalendar && cachedCalendar.year === year) {
        return cachedCalendar
      }

      setIsCalendarLoading(true)

      try {
        const calendar = await fetchJson<MarketCalendar>(
          `/api/stocks/calendar?market=${market}&year=${year}`,
        )

        setMarketCalendars((current) => ({
          ...current,
          [market]: calendar,
        }))

        return calendar
      } finally {
        setIsCalendarLoading(false)
      }
    },
    [marketCalendars],
  )

  useEffect(() => {
    let isActive = true

    async function loadStockList(market: Market) {
      setIsStockListLoading((current) => ({ ...current, [market]: true }))

      try {
        const query = market === 'TW' ? '' : '?market=US'
        const data = await fetchJson<StockListResponse>(`/api/stocks${query}`)

        if (!isActive) return

        if (market === 'TW') {
          setTwStocks(data.data)
          if (!selectedSymbol && data.data[0]) {
            setSelectedMarket('TW')
            setActiveMarket('TW')
            setSelectedSymbol(data.data[0].symbol)
          }
        } else {
          setUsStocks(data.data)
        }
      } catch (error) {
        if (!isActive) return
        setMessage(`${market === 'TW' ? '台股' : '美股'}列表載入失敗：${getErrorMessage(error)}`)
      } finally {
        if (isActive) {
          setIsStockListLoading((current) => ({ ...current, [market]: false }))
        }
      }
    }

    void Promise.all([loadStockList('TW'), loadStockList('US')])

    return () => {
      isActive = false
    }
  }, [selectedSymbol])

  useEffect(() => {
    let isActive = true

    async function loadSelectedMarket() {
      if (!selectedSymbol) {
        setQuote(null)
        setHistory([])
        setIsInitialDashboardLoading(false)
        return
      }

      setIsQuoteLoading(true)

      try {
        const [nextQuote, nextHistory] = await Promise.all([
          fetchJson<StockQuote>(`/api/stocks/${activeMarket}/${selectedSymbol}`),
          fetchJson<StockHistoryResponse>(
            `/api/stocks/${activeMarket}/${selectedSymbol}/history/range?months=6`,
          ),
        ])

        if (!isActive) return

        setQuote(nextQuote)
        setHistory(nextHistory.data)
        const nextLimitPrice = normalizeOrderPrice(nextQuote.close ?? 0)
        setLimitPrice(nextLimitPrice)
        setLimitPriceInput(formatOrderPriceInput(nextLimitPrice))
      } catch (error) {
        if (!isActive) return

        setQuote(null)
        setHistory([])
        setLimitPrice(0)
        setLimitPriceInput('')
        setMessage(`行情載入失敗：${getErrorMessage(error)}`)
      } finally {
        if (isActive) {
          setIsQuoteLoading(false)
          setIsInitialDashboardLoading(false)
        }
      }
    }

    void loadSelectedMarket()

    return () => {
      isActive = false
    }
  }, [activeMarket, selectedSymbol])

  useEffect(() => {
    if (!token) return

    const activeToken = token

    async function restoreSession() {
      try {
        const data = await fetchJson<{ user: AuthUser }>('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        })

        setUser(data.user)
        setIsRestoringSession(false)

        try {
          await refreshAccount(activeToken)
        } catch (accountError) {
          setMessage(`登入成功，但帳戶資料載入失敗：${getErrorMessage(accountError)}`)
        }
      } catch (error) {
        localStorage.removeItem('authToken')
        setToken(null)
        setUser(null)
        setPortfolio(null)
        setCashTransactions([])
        setOrders([])
        setIsInitialDashboardLoading(false)
        setMessage(`登入狀態已失效：${getErrorMessage(error)}`)
      } finally {
        setIsRestoringSession(false)
      }
    }

    void restoreSession()
  }, [refreshAccount, token])

  useEffect(() => {
    if (!message) return

    const timer = window.setTimeout(() => {
      setMessage('')
    }, 3000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [message])

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthMessage('')

    const submitMode = mode
    const form = new FormData(event.currentTarget)
    const submittedEmail = String(form.get('email') ?? email).trim()
    const submittedPassword = String(form.get('password') ?? password).trim()

    setEmail(submittedEmail)
    setPassword(submittedPassword)

    if (!submittedEmail || !submittedPassword) {
      setAuthMessage('未填寫帳號或密碼')
      return
    }

    setIsLoading(true)

    try {
      const data = await fetchJson<AuthResponse>(`/api/auth/${submitMode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: submittedEmail,
          password: submittedPassword,
        }),
      })

      if (submitMode === 'register') {
        setMode('login')
        setEmail(submittedEmail)
        setPassword('')
        setAuthMessage('註冊成功，請登入')
        return
      }

      localStorage.setItem('authToken', data.token)
      setToken(data.token)
      setUser(data.user)

      try {
        await refreshAccount(data.token)
      } catch (accountError) {
        setAuthMessage(`登入成功，但帳戶資料載入失敗：${getErrorMessage(accountError)}`)
        return
      }

      closeAuthDialog()
      setMessage('登入成功')
    } catch (error) {
      setAuthMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  function handleMarketChange(nextMarket: Market) {
    const firstStock = nextMarket === 'TW' ? twStocks[0] : usStocks[0]

    setSelectedMarket(nextMarket)
    setActiveMarket(nextMarket)
    setSymbolInput('')
    setVisibleStockCount(stockListBatchSize)
    setSelectedSymbol(firstStock?.symbol ?? '')
    setQuote(null)
    setHistory([])
    setMessage('')
  }

  function loadSymbol(market: Market, symbol: string, updateInput = true) {
    setSelectedMarket(market)
    setActiveMarket(market)
    setSelectedSymbol(symbol)
    if (updateInput) {
      setSymbolInput(symbol)
    }
    setMessage('')
  }

  async function handleSymbolSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedSymbol = symbolInput.trim().toUpperCase()

    if (!normalizedSymbol) {
      setMessage('請輸入股票代號')
      return
    }

    if (!isValidSymbolForMarket(selectedMarket, normalizedSymbol)) {
      setQuote(null)
      setHistory([])
      setMessage(
        selectedMarket === 'TW'
          ? '台股代號格式不正確，例如 2330、0050、00400A'
          : '美股代號格式不正確，例如 NVDA、AAPL、TSLA',
      )
      return
    }

    loadSymbol(selectedMarket, normalizedSymbol)
  }

  function handleSymbolInputChange(value: string) {
    setSymbolInput(value)
    setVisibleStockCount(stockListBatchSize)
  }

  function handleStockListScroll(event: UIEvent<HTMLDivElement>) {
    const element = event.currentTarget
    const isNearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 24
    if (!isNearBottom) return

    setVisibleStockCount((current) => Math.min(current + stockListBatchSize, filteredStocks.length))
  }

  function handleLoadMoreStocks() {
    setVisibleStockCount((current) => Math.min(current + stockListBatchSize, filteredStocks.length))
  }

  function handleMobileHoldingSelect(market: Market, symbol: string) {
    setMobileView('market')
    loadSymbol(market, symbol)
  }

  async function handleOrderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token) {
      openAuthDialog('login', '請先登入後再送出委託')
      return
    }

    if (!quote || activeMarket !== selectedMarket) {
      setMessage('請先選擇有效標的後再下單')
      return
    }

    if (orderType === 'LIMIT' && (!Number.isFinite(activeLimitPrice) || activeLimitPrice <= 0)) {
      setMessage('請輸入有效的限價價格')
      return
    }

    setIsSubmittingOrder(true)
    setMessage('')

    try {
      const order = await fetchJson<TradeOrder>('/api/orders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          market: activeMarket,
          symbol: selectedSymbol,
          side: orderSide,
          orderType,
          limitPrice: orderType === 'LIMIT' ? normalizeOrderPrice(activeLimitPrice) : undefined,
          quantity,
        }),
      })

      await refreshAccount(token)
      setMessage(
        order.status === 'FILLED'
          ? '委託已成交'
          : order.isNextSessionOrder
            ? `已送出預約單，將於 ${order.effectiveDate ?? '下一個交易日'} 生效`
            : '委託已送出，等待成交',
      )
    } catch (error) {
      setMessage(getErrorMessage(error))
    } finally {
      setIsSubmittingOrder(false)
    }
  }

  async function handleCancelOrder(orderId: number) {
    if (!token) {
      openAuthDialog('login', '請先登入後再查看委託紀錄')
      return
    }

    setCancellingOrderId(orderId)
    setMessage('')

    try {
      await fetchJson<TradeOrder>(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      await refreshAccount(token)
      setMessage('委託已取消')
    } catch (error) {
      setMessage(getErrorMessage(error))
    } finally {
      setCancellingOrderId(null)
    }
  }

  function requestCancelOrder(orderId: number) {
    setCancelOrderId(orderId)
  }

  async function handleOpenCalendar() {
    setIsCalendarOpen(true)

    try {
      await loadMarketCalendar(activeMarket)
    } catch (error) {
      setMessage(getErrorMessage(error))
    }
  }

  async function confirmCancelOrder() {
    if (cancelOrderId === null) return

    const orderId = cancelOrderId
    setCancelOrderId(null)
    await handleCancelOrder(orderId)
  }

  function openTransferDialog(
    currency: 'TWD' | 'USD',
    direction: 'BANK_TO_BROKER' | 'BROKER_TO_BANK' = 'BANK_TO_BROKER',
  ) {
    if (!isSignedIn) {
      openAuthDialog('login', '登入後可使用銀行轉帳')
      return
    }

    setTransferCurrency(currency)
    setTransferDirection(direction)
    setTransferAmountInput('')
    setIsTransferOpen(true)
    setMessage('')
  }

  async function handleTransferSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!token) {
      openAuthDialog('login', '登入後可使用銀行轉帳')
      return
    }

    const amount = Number(transferAmountInput)
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage('請輸入大於 0 的轉帳金額')
      return
    }

    setIsTransferLoading(true)
    setMessage('')

    try {
      await fetchJson<TransferResponse>('/api/portfolio/transfer', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currency: transferCurrency,
          direction: transferDirection,
          amount,
        }),
      })

      await refreshAccount(token)
      setIsTransferOpen(false)
      setTransferAmountInput('')
      setMessage(
        transferDirection === 'BANK_TO_BROKER'
          ? `${transferCurrency} 已轉入證券戶`
          : `${transferCurrency} 已轉回銀行`,
      )
    } catch (error) {
      setMessage(getErrorMessage(error))
    } finally {
      setIsTransferLoading(false)
    }
  }

  function handleLimitPriceInputChange(value: string) {
    if (!/^\d*(?:\.\d*)?$/.test(value)) return

    setLimitPriceInput(value)
    const nextPrice = Number(value)
    if (Number.isFinite(nextPrice)) {
      setLimitPrice(nextPrice)
    }
  }

  function handleLimitPriceBlur() {
    const nextPrice = Number(limitPriceInput)
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
      setLimitPriceInput('')
      return
    }

    const normalizedPrice = normalizeOrderPrice(nextPrice)
    setLimitPrice(normalizedPrice)
    setLimitPriceInput(formatOrderPriceInput(normalizedPrice))
  }

  function handleLogout() {
    localStorage.removeItem('authToken')
    setToken(null)
    setUser(null)
    setPortfolio(null)
    setCashTransactions([])
    setOrders([])
    setIsCalendarOpen(false)
    setIsAuthDialogOpen(false)
    setAuthMessage('')
    setEmail('')
    setPassword('')
    setMessage('')
    setMode('login')
    setIsInitialDashboardLoading(false)
  }

  if (isRestoringSession || isInitialDashboardLoading) {
    return (
      <main className="space-page auth-layout">
        <div className="star-field" aria-hidden="true" />
        <section className="auth-panel session-panel" aria-label="恢復登入狀態">
          <div className="brand-mark">
            <span>TW</span>
            <strong>SIM</strong>
          </div>
          <p className="eyebrow">同步帳戶與市場資料</p>
          <h1>資料載入中</h1>
          <LoadingRing label="載入中" progress={sessionProgress.progress} size="lg" />
        </section>
      </main>
    )
  }

  return (
    <main className={`space-page dashboard-layout mobile-view-${mobileView}`}>
      <div className="star-field" aria-hidden="true" />
      <header className="dashboard-header glass-panel">
        <div>
          <div className="brand-line">
            <span>TW</span>
            <strong>SIM</strong>
          </div>
          <h1>全球交易控制台</h1>
        </div>
        <div className="user-bar">
          <button type="button" onClick={handleOpenCalendar}>
            交易日曆
          </button>
          {isSignedIn ? (
            <>
              <button type="button" onClick={() => setIsCashHistoryOpen(true)}>
                資金紀錄
              </button>
              <button type="button" onClick={() => openTransferDialog(selectedCurrency)}>
                銀行轉帳
              </button>
              <button type="button" onClick={() => setDetailModal('holdings')}>
                目前持倉
              </button>
              <button type="button" onClick={() => setDetailModal('orders')}>
                交易紀錄
              </button>
              <span>{user?.email}</span>
              <button type="button" onClick={handleLogout}>
                登出
              </button>
            </>
          ) : (
            <>
              <span>訪客模式</span>
              <button type="button" onClick={() => openAuthDialog('login')}>
                登入
              </button>
              <button type="button" onClick={() => openAuthDialog('register')}>
                註冊
              </button>
            </>
          )}
        </div>
      </header>

      <SummaryCards
        selectedCurrency={selectedCurrency}
        selectedMarket={selectedMarket}
        selectedTotals={selectedTotals}
      />

      <section className="terminal-grid">
        <StockListPanel
          activeMarket={activeMarket}
          filteredStocks={filteredStocks}
          isMobileLayout={isMobileLayout}
          isStockListLoading={isStockListLoading}
          quote={quote}
          selectedCurrency={selectedCurrency}
          selectedMarket={selectedMarket}
          symbolInput={symbolInput}
          twStockCount={twStocks.length}
          usStockCount={usStocks.length}
          visibleStocks={visibleStocks}
          onLoadMore={handleLoadMoreStocks}
          onMarketChange={handleMarketChange}
          onScroll={handleStockListScroll}
          onSearchSubmit={handleSymbolSubmit}
          onSymbolInputChange={handleSymbolInputChange}
          onSymbolSelect={loadSymbol}
        />

        <ChartPanel
          activeMarket={activeMarket}
          chartData={chartData}
          isLoading={quoteProgress.isVisible}
          progress={quoteProgress.progress}
          quote={quote}
          selectedCurrency={selectedCurrency}
          selectedSymbol={selectedSymbol}
        />

        <OrderPanel
          estimatedAmount={estimatedAmount}
          estimatedFee={estimatedCost.fee}
          estimatedNetAmount={estimatedCost.netAmount}
          estimatedPrice={estimatedPrice}
          estimatedTax={estimatedCost.tax}
          isMobileLayout={isMobileLayout}
          isOrderLoading={orderProgress.isVisible}
          limitPriceInput={limitPriceInput}
          market={activeMarket}
          orderSide={orderSide}
          orderType={orderType}
          progress={orderProgress.progress}
          quantity={quantity}
          quote={quote}
          selectedCurrency={selectedCurrency}
          onLimitPriceBlur={handleLimitPriceBlur}
          onLimitPriceChange={handleLimitPriceInputChange}
          onOpenCalendar={handleOpenCalendar}
          onOrderSideChange={setOrderSide}
          onOrderTypeChange={setOrderType}
          onQuantityChange={setQuantity}
          onSubmit={handleOrderSubmit}
        />
      </section>

      <DetailModal
        cancellingOrderId={cancellingOrderId}
        detailModal={detailModal}
        holdings={holdings}
        orders={orders}
        onCancelOrder={requestCancelOrder}
        onClose={() => setDetailModal(null)}
      />

      <MobileHoldingsPanel holdings={holdings} onHoldingSelect={handleMobileHoldingSelect} />
      <MobileAccountPanel
        accountMarket={mobileAccountMarket}
        isSignedIn={isSignedIn}
        selectedCurrency={mobileAccountCurrency}
        selectedTotals={mobileAccountTotals}
        user={user}
        onAccountMarketChange={setMobileAccountMarket}
        onAuthClick={() => openAuthDialog('login')}
        onOpenCashHistory={() => {
          if (!isSignedIn) {
            openAuthDialog('login', '請先登入後再查看資金紀錄')
            return
          }
          setIsCashHistoryOpen(true)
        }}
        onTransferClick={openTransferDialog}
        onLogout={handleLogout}
      />
      <MobileOrdersPanel
        cancellingOrderId={cancellingOrderId}
        orders={orders}
        onCancelOrder={requestCancelOrder}
      />
      <MobileBottomNav activeView={mobileView} onViewChange={handleMobileViewChange} />

      {isCashHistoryOpen && (
        <CashHistoryModal
          cashTransactions={cashTransactions}
          isMobileLayout={isMobileLayout}
          selectedCurrency={isMobileLayout ? mobileAccountCurrency : selectedCurrency}
          onClose={() => setIsCashHistoryOpen(false)}
        />
      )}

      {isCalendarOpen && (
        <MarketCalendarModal
          calendar={activeCalendar}
          isLoading={isCalendarLoading}
          market={activeMarket}
          onClose={() => setIsCalendarOpen(false)}
        />
      )}

      {cancelOrderId !== null && (
        <div className="confirm-backdrop" role="presentation" onClick={() => setCancelOrderId(null)}>
          <section
            className="confirm-dialog glass-panel"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
            aria-describedby="cancel-order-description"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <span>取消委託</span>
              <strong id="cancel-order-title">確定要取消這筆委託嗎？</strong>
              <p id="cancel-order-description">取消後會釋放凍結資金或股數，這個動作無法復原。</p>
            </div>
            <div className="confirm-actions">
              <button type="button" onClick={() => setCancelOrderId(null)}>
                先不要
              </button>
              <button
                className="danger"
                disabled={cancellingOrderId !== null}
                type="button"
                onClick={confirmCancelOrder}
              >
                確認取消
              </button>
            </div>
          </section>
        </div>
      )}

      {isTransferOpen && (
        <div className="confirm-backdrop" role="presentation" onClick={() => setIsTransferOpen(false)}>
          <section
            className="deposit-dialog glass-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transfer-title"
            onClick={(event) => event.stopPropagation()}
          >
            <form onSubmit={handleTransferSubmit}>
              <div>
                <span>銀行與證券轉帳</span>
                <strong id="transfer-title">模擬銀行轉帳</strong>
                <p>模擬銀行帳戶與證券戶之間的資金移轉。轉入證券戶後才可用於下單。</p>
              </div>
              <div className="deposit-currency-tabs" role="group" aria-label="轉帳方向">
                <button
                  className={transferDirection === 'BANK_TO_BROKER' ? 'active' : ''}
                  type="button"
                  onClick={() => setTransferDirection('BANK_TO_BROKER')}
                >
                  轉入證券戶
                </button>
                <button
                  className={transferDirection === 'BROKER_TO_BANK' ? 'active' : ''}
                  type="button"
                  onClick={() => setTransferDirection('BROKER_TO_BANK')}
                >
                  轉回銀行
                </button>
              </div>
              <div className="deposit-currency-tabs" role="group" aria-label="轉帳幣別">
                <button
                  className={transferCurrency === 'TWD' ? 'active' : ''}
                  type="button"
                  onClick={() => setTransferCurrency('TWD')}
                >
                  TWD
                </button>
                <button
                  className={transferCurrency === 'USD' ? 'active' : ''}
                  type="button"
                  onClick={() => setTransferCurrency('USD')}
                >
                  USD
                </button>
              </div>
              <label>
                <span>轉帳金額</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => {
                    if (/^\d*(?:\.\d*)?$/.test(event.target.value)) {
                      setTransferAmountInput(event.target.value)
                    }
                  }}
                  placeholder={transferCurrency === 'TWD' ? '例如 100000' : '例如 5000'}
                  type="text"
                  value={transferAmountInput}
                />
              </label>
              <div className="confirm-actions">
                <button type="button" onClick={() => setIsTransferOpen(false)}>
                  取消
                </button>
                <button className="confirm" disabled={isTransferLoading} type="submit">
                  {isTransferLoading ? '處理中' : '確認轉帳'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {isAuthDialogOpen && (
        <div className="modal-backdrop auth-modal-backdrop" role="presentation" onClick={closeAuthDialog}>
          <div className="auth-modal-shell" onClick={(event) => event.stopPropagation()}>
            <AuthPanel
              authModeLabel={authModeLabel}
              email={email}
              isLoading={authProgress.isVisible}
              isModal
              message={authMessage}
              mode={mode}
              password={password}
              progress={authProgress.progress}
              switchLabel={switchLabel}
              onClose={closeAuthDialog}
              onEmailChange={setEmail}
              onModeChange={(nextMode) => {
                setMode(nextMode)
                if (nextMode === 'register') {
                  setEmail('')
                }
                setPassword('')
                setAuthMessage('')
              }}
              onPasswordChange={setPassword}
              onSubmit={handleAuthSubmit}
            />
          </div>
        </div>
      )}

      {message && <p className="toast-message">{message}</p>}
    </main>
  )
}

export default App
