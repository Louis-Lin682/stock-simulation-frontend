import { useState } from 'react'
import type { AuthUser, Currency, CurrencyTotal, Holding, Market, TradeOrder } from '../types'
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPercent,
  getMarketLabel,
} from '../utils/format'

export type MobileView = 'market' | 'holdings' | 'account' | 'orders'

type MobileBottomNavProps = {
  activeView: MobileView
  onViewChange: (view: MobileView) => void
}

type MobileAccountPanelProps = {
  accountMarket: Market
  isSignedIn: boolean
  selectedCurrency: Currency
  selectedTotals: CurrencyTotal
  user: AuthUser | null
  onAccountMarketChange: (market: Market) => void
  onAuthClick: () => void
  onOpenCashHistory: () => void
  onTransferClick: (currency: Currency) => void
  onLogout: () => void
}

type MobileHoldingsPanelProps = {
  holdings: Holding[]
  onHoldingSelect: (market: Market, symbol: string) => void
}

type MobileOrdersPanelProps = {
  cancellingOrderId: number | null
  orders: TradeOrder[]
  onCancelOrder: (orderId: number) => void
}

const mobileNavItems: Array<{ icon: string; label: string; view: MobileView }> = [
  { icon: '◈', label: '行情', view: 'market' },
  { icon: '◫', label: '持倉', view: 'holdings' },
  { icon: '☰', label: '紀錄', view: 'orders' },
  { icon: '⬡', label: '帳戶', view: 'account' },
]

function getStatusLabel(order: TradeOrder) {
  if (order.status === 'FILLED') return '已成交'
  if (order.status === 'CANCELLED') return '已取消'
  if (order.isNextSessionOrder) return '預約單'
  return '掛單中'
}

function getTypeLabel(type: TradeOrder['orderType']) {
  return type === 'MARKET' ? '市價' : '限價'
}

export function MobileBottomNav({ activeView, onViewChange }: MobileBottomNavProps) {
  return (
    <nav className="mobile-bottom-nav" aria-label="底部導覽">
      {mobileNavItems.map((item) => (
        <button
          aria-current={activeView === item.view ? 'page' : undefined}
          className={activeView === item.view ? 'active' : ''}
          key={item.view}
          type="button"
          onClick={() => onViewChange(item.view)}
        >
          <span aria-hidden="true">{item.icon}</span>
          <strong>{item.label}</strong>
        </button>
      ))}
    </nav>
  )
}

export function MobileAccountPanel({
  accountMarket,
  isSignedIn,
  selectedCurrency,
  selectedTotals,
  user,
  onAccountMarketChange,
  onAuthClick,
  onOpenCashHistory,
  onTransferClick,
  onLogout,
}: MobileAccountPanelProps) {
  const totalPnLClass = selectedTotals.totalPnL >= 0 ? 'price-up' : 'price-down'
  const pendingCashText = formatCurrency(selectedTotals.pendingBuyAmount, selectedCurrency)
  const pendingQuantityText = formatNumber(selectedTotals.pendingSellQuantity)
  const hasPendingOrders = selectedTotals.pendingOrderCount > 0

  return (
    <section className="mobile-page mobile-account-page">
      <div className="mobile-profile-card glass-panel">
        <span className="mobile-avatar" aria-hidden="true">
          TW
        </span>
        <div className="mobile-profile-copy">
          <span>模擬帳戶</span>
          <strong title={user?.email ?? '訪客帳戶'}>{user?.email ?? '訪客帳戶'}</strong>
          <small>{isSignedIn ? '已登入 / 可查看資產與交易紀錄' : '訪客模式 / 登入後可開始下單'}</small>
        </div>
        <div className="mobile-profile-actions">
          {isSignedIn ? (
            <>
              <button type="button" onClick={() => onTransferClick(selectedCurrency)}>
                轉帳
              </button>
              <button type="button" onClick={onLogout}>
                登出
              </button>
            </>
          ) : (
            <button type="button" onClick={onAuthClick}>
              登入
            </button>
          )}
        </div>
      </div>

      <div className="mobile-account-market-tabs" role="group" aria-label="帳戶市場切換">
        <button
          className={accountMarket === 'TW' ? 'active' : ''}
          type="button"
          onClick={() => onAccountMarketChange('TW')}
        >
          台股資產
        </button>
        <button
          className={accountMarket === 'US' ? 'active' : ''}
          type="button"
          onClick={() => onAccountMarketChange('US')}
        >
          美股資產
        </button>
      </div>

      <article className="mobile-asset-hero glass-panel">
        <span>
          {getMarketLabel(accountMarket)} / {selectedCurrency} 總資產
        </span>
        <strong>{formatCurrency(selectedTotals.totalValue, selectedCurrency)}</strong>
        <small className={totalPnLClass}>
          總損益 {formatCurrency(selectedTotals.totalPnL, selectedCurrency)} /{' '}
          {formatPercent(selectedTotals.totalReturnPercent)}
        </small>
      </article>

      <div className="mobile-account-metrics">
        <article className="glass-panel">
          <span>銀行餘額</span>
          <strong>{formatCurrency(selectedTotals.bankCash, selectedCurrency)}</strong>
        </article>
        <article className="glass-panel">
          <span>證券戶現金</span>
          <strong>{formatCurrency(selectedTotals.cash, selectedCurrency)}</strong>
        </article>
        <article className="glass-panel">
          <span>股票市值</span>
          <strong>{formatCurrency(selectedTotals.marketValue, selectedCurrency)}</strong>
        </article>
        <article className="glass-panel">
          <span>未實現損益</span>
          <strong className={selectedTotals.unrealizedPnL >= 0 ? 'price-up' : 'price-down'}>
            {formatCurrency(selectedTotals.unrealizedPnL, selectedCurrency)}
          </strong>
        </article>
        <article className="glass-panel">
          <span>已實現損益</span>
          <strong className={selectedTotals.realizedPnL >= 0 ? 'price-up' : 'price-down'}>
            {formatCurrency(selectedTotals.realizedPnL, selectedCurrency)}
          </strong>
        </article>
        <article className="glass-panel">
          <span>凍結現金</span>
          <strong>{formatCurrency(selectedTotals.reservedCash, selectedCurrency)}</strong>
        </article>
        <article className="glass-panel">
          <span>累計費稅</span>
          <strong>
            {formatCurrency(selectedTotals.cumulativeFee + selectedTotals.cumulativeTax, selectedCurrency)}
          </strong>
        </article>
      </div>

      <article className="mobile-pending-card glass-panel">
        <div>
          <span>掛單狀態</span>
          <strong>
            {hasPendingOrders ? `${formatNumber(selectedTotals.pendingOrderCount)} 筆掛單` : '目前沒有掛單'}
          </strong>
        </div>
        {hasPendingOrders && (
          <dl>
            <div>
              <dt>凍結買進金額</dt>
              <dd>{pendingCashText}</dd>
            </div>
            <div>
              <dt>待賣股數</dt>
              <dd>{pendingQuantityText} 股</dd>
            </div>
          </dl>
        )}
      </article>

      <button className="mobile-cash-entry glass-panel" type="button" onClick={onOpenCashHistory}>
        <span>資金紀錄</span>
        <strong>{selectedCurrency} 完整轉帳明細</strong>
        <small>查看銀行與證券戶之間的轉帳，以及每次異動後的餘額變化</small>
      </button>
    </section>
  )
}

export function MobileHoldingsPanel({ holdings, onHoldingSelect }: MobileHoldingsPanelProps) {
  return (
    <section className="mobile-page mobile-list-page mobile-holdings-page" aria-label="目前持倉">
      <div className="mobile-page-heading">
        <span>目前持倉</span>
        <strong>{holdings.length} 檔</strong>
      </div>
      <div className="mobile-card-list">
        {holdings.length === 0 ? (
          <p className="list-state">目前沒有持倉</p>
        ) : (
          holdings.map((holding) => {
            const pnlText = formatCurrency(holding.unrealizedPnL, holding.currency)

            return (
              <button
                className="mobile-holding-card glass-panel"
                key={holding.id}
                type="button"
                onClick={() => onHoldingSelect(holding.market, holding.symbol)}
              >
                <span className="mobile-card-title">
                  <strong>{holding.symbol}</strong>
                  <small title={holding.name}>{holding.name}</small>
                </span>
                <span className="mobile-card-grid">
                  <span>
                    <em>持有股數</em>
                    <b>{formatNumber(holding.quantity)}</b>
                  </span>
                  <span>
                    <em>可賣股數</em>
                    <b>{formatNumber(holding.availableQuantity)}</b>
                  </span>
                  <span>
                    <em>平均成本</em>
                    <b>{formatCurrency(holding.averageCost, holding.currency)}</b>
                  </span>
                  <span>
                    <em>市值</em>
                    <b>{formatCurrency(holding.marketValue, holding.currency)}</b>
                  </span>
                </span>
                <span className={holding.unrealizedPnL >= 0 ? 'price-up' : 'price-down'}>
                  未實現 {pnlText}
                </span>
              </button>
            )
          })
        )}
      </div>
    </section>
  )
}

export function MobileOrdersPanel({
  cancellingOrderId,
  orders,
  onCancelOrder,
}: MobileOrdersPanelProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)
  const [showPendingOnly, setShowPendingOnly] = useState(false)
  const visibleOrders = showPendingOnly
    ? orders.filter((order) => order.status === 'PENDING')
    : orders

  return (
    <section className="mobile-page mobile-list-page mobile-orders-page" aria-label="交易紀錄">
      <div className="mobile-page-heading">
        <span>交易紀錄</span>
        <strong>{visibleOrders.length} 筆</strong>
      </div>
      <div className="mobile-segmented" role="group" aria-label="交易紀錄篩選">
        <button
          className={!showPendingOnly ? 'active' : ''}
          type="button"
          onClick={() => setShowPendingOnly(false)}
        >
          全部
        </button>
        <button
          className={showPendingOnly ? 'active' : ''}
          type="button"
          onClick={() => setShowPendingOnly(true)}
        >
          掛單
        </button>
      </div>
      <div className="mobile-card-list">
        {visibleOrders.length === 0 ? (
          <p className="list-state">{showPendingOnly ? '目前沒有掛單' : '目前沒有交易紀錄'}</p>
        ) : (
          visibleOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id
            const statusText = getStatusLabel(order)
            const sideText = order.side === 'BUY' ? '買進' : '賣出'
            const filledPriceText =
              order.filledPrice === null ? '-' : formatCurrency(order.filledPrice, order.currency)

            return (
              <article className="mobile-order-card glass-panel" key={order.id}>
                <button
                  className="mobile-order-summary"
                  type="button"
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                >
                  <span>
                    <strong>{order.symbol}</strong>
                    <small title={order.name}>{order.name}</small>
                  </span>
                  <span className="mobile-order-side">
                    <b className={order.side === 'BUY' ? 'price-up' : 'price-down'}>{sideText}</b>
                    <em className={`status-pill ${order.status.toLowerCase()}`}>{statusText}</em>
                  </span>
                </button>
                <div className="mobile-order-meta">
                  <span>{formatDateTime(order.createdAt)}</span>
                  <strong>{formatCurrency(order.netAmount || order.amount, order.currency)}</strong>
                </div>
                <div className={`mobile-order-detail${isExpanded ? ' is-open' : ''}`}>
                  <dl>
                    <div>
                      <dt>委託類型</dt>
                      <dd>{getTypeLabel(order.orderType)}</dd>
                    </div>
                    <div>
                      <dt>數量</dt>
                      <dd>{formatNumber(order.quantity)}</dd>
                    </div>
                    <div>
                      <dt>委託價格</dt>
                      <dd>{formatCurrency(order.price, order.currency)}</dd>
                    </div>
                    <div>
                      <dt>成交價格</dt>
                      <dd>{filledPriceText}</dd>
                    </div>
                    <div>
                      <dt>成交金額</dt>
                      <dd>{formatCurrency(order.amount, order.currency)}</dd>
                    </div>
                    <div>
                      <dt>手續費與稅</dt>
                      <dd>{formatCurrency((order.fee ?? 0) + (order.tax ?? 0), order.currency)}</dd>
                    </div>
                    <div>
                      <dt>已實現損益</dt>
                      <dd className={(order.realizedPnL ?? 0) >= 0 ? 'price-up' : 'price-down'}>
                        {formatCurrency(order.realizedPnL ?? 0, order.currency)}
                      </dd>
                    </div>
                    <div>
                      <dt>剩餘現金</dt>
                      <dd>
                        {order.availableCashAfter === null
                          ? '-'
                          : formatCurrency(order.availableCashAfter, order.currency)}
                      </dd>
                    </div>
                  </dl>
                </div>
                {order.status === 'PENDING' && (
                  <button
                    className="table-action mobile-cancel-button"
                    disabled={cancellingOrderId === order.id}
                    type="button"
                    onClick={() => onCancelOrder(order.id)}
                  >
                    取消委託
                  </button>
                )}
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}
