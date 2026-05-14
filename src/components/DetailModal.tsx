import type { CSSProperties } from 'react'
import { useState } from 'react'
import type { DetailModal as DetailModalType, Holding, TradeOrder } from '../types'
import { formatCurrency, formatDateTime, formatNumber } from '../utils/format'

type DetailModalProps = {
  cancellingOrderId: number | null
  detailModal: DetailModalType
  holdings: Holding[]
  orders: TradeOrder[]
  onCancelOrder: (orderId: number) => void
  onClose: () => void
}

type OrderDetailState = {
  closingOrderId: number | null
  expandedOrderId: number | null
}

const DETAIL_CLOSE_MS = 180

function getStatusLabel(order: TradeOrder) {
  if (order.status === 'FILLED') return '已成交'
  if (order.status === 'CANCELLED') return '已取消'
  if (order.isNextSessionOrder) return '預約單'
  return '掛單中'
}

function getTypeLabel(type: TradeOrder['orderType']) {
  return type === 'MARKET' ? '市價' : '限價'
}

function renderDetailItem(label: string, value: string) {
  return (
    <div title={`${label} ${value}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function renderDetailItemWithTitle(label: string, value: string, title: string) {
  return (
    <div title={`${label} ${title}`}>
      <span>{label}</span>
      <strong title={title}>{value}</strong>
    </div>
  )
}

function renderHoldingsRows(items: Holding[]) {
  return items.map((holding) => {
    const symbolText = `${holding.market} ${holding.symbol}`
    const quantityText = formatNumber(holding.quantity)
    const availableQuantityText = formatNumber(holding.availableQuantity)
    const averageCostText = formatCurrency(holding.averageCost, holding.currency)
    const marketValueText = formatCurrency(holding.marketValue, holding.currency)
    const pnlText = formatCurrency(holding.unrealizedPnL, holding.currency)

    return (
      <tr key={holding.id}>
        <td className="stock-name-cell" title={`${symbolText} ${holding.name}`}>
          <strong title={symbolText}>{symbolText}</strong>
          <span title={holding.name}>{holding.name}</span>
        </td>
        <td title={quantityText}>{quantityText}</td>
        <td title={availableQuantityText}>{availableQuantityText}</td>
        <td title={averageCostText}>{averageCostText}</td>
        <td title={marketValueText}>{marketValueText}</td>
        <td className={holding.unrealizedPnL >= 0 ? 'price-up' : 'price-down'} title={pnlText}>
          {pnlText}
        </td>
      </tr>
    )
  })
}

function OrderDetailRow({ isClosing, order }: { isClosing: boolean; order: TradeOrder }) {
  const amountText = formatCurrency(order.amount, order.currency)
  const feeText = formatCurrency(order.fee ?? 0, order.currency)
  const taxText = formatCurrency(order.tax ?? 0, order.currency)
  const netAmountText = formatCurrency(order.netAmount || order.amount, order.currency)
  const realizedPnLText = formatCurrency(order.realizedPnL ?? 0, order.currency)
  const filledPriceText =
    order.filledPrice === null ? '-' : formatCurrency(order.filledPrice, order.currency)
  const cancelledAtText = order.cancelledAt ? formatDateTime(order.cancelledAt) : '-'
  const filledAtText = order.filledAt ? formatDateTime(order.filledAt) : '-'
  const hasSnapshot =
    order.availableCashBefore !== null ||
    order.availableCashAfter !== null ||
    order.availableQuantityBefore !== null ||
    order.availableQuantityAfter !== null
  const cashSnapshot =
    order.availableCashBefore === null || order.availableCashAfter === null
      ? '交易前後現金未記錄'
      : `${formatCurrency(order.availableCashBefore, order.currency)} -> ${formatCurrency(
          order.availableCashAfter,
          order.currency,
        )}`
  const cashSnapshotValue =
    order.availableCashAfter === null
      ? '交易前後現金未記錄'
      : formatCurrency(order.availableCashAfter, order.currency)
  const quantitySnapshot =
    order.availableQuantityBefore === null || order.availableQuantityAfter === null
      ? '交易前後股數未記錄'
      : `${formatNumber(order.availableQuantityBefore)} -> ${formatNumber(
          order.availableQuantityAfter,
        )}`
  const quantitySnapshotValue =
    order.availableQuantityAfter === null
      ? '交易前後股數未記錄'
      : formatNumber(order.availableQuantityAfter)

  return (
    <tr className={`order-detail-row${isClosing ? ' is-closing' : ''}`}>
      <td colSpan={10}>
        <div className="order-detail-panel">
          {renderDetailItem('委託類型', getTypeLabel(order.orderType))}
          {renderDetailItem('委託價格', formatCurrency(order.price, order.currency))}
          {renderDetailItem('成交價格', filledPriceText)}
          {renderDetailItem('委託數量', formatNumber(order.quantity))}
          {renderDetailItem('成交金額', amountText)}
          {renderDetailItem('手續費', feeText)}
          {renderDetailItem('交易稅', taxText)}
          {renderDetailItem(order.side === 'BUY' ? '買進總支出' : '賣出總入帳', netAmountText)}
          {renderDetailItem('已實現損益', realizedPnLText)}
          {renderDetailItemWithTitle('剩餘現金', cashSnapshotValue, cashSnapshot)}
          {renderDetailItemWithTitle('剩餘股數', quantitySnapshotValue, quantitySnapshot)}
          {renderDetailItem('建立時間', formatDateTime(order.createdAt))}
          {order.isNextSessionOrder &&
            renderDetailItem('生效交易日', order.effectiveDate ?? '下一個交易日')}
          {renderDetailItem('成交時間', filledAtText)}
          {renderDetailItem('取消時間', cancelledAtText)}
          {!hasSnapshot && renderDetailItem('快照說明', '這筆紀錄建立於舊資料版本，尚未保留前後快照')}
        </div>
      </td>
    </tr>
  )
}

function renderOrderRows(
  items: TradeOrder[],
  detailState: OrderDetailState,
  cancellingOrderId: number | null,
  onCancelOrder: (orderId: number) => void,
  onToggleOrder: (orderId: number) => void,
) {
  return items.flatMap((order) => {
    const timeText = formatDateTime(order.createdAt)
    const statusText = getStatusLabel(order)
    const typeText = getTypeLabel(order.orderType)
    const sideText = order.side === 'BUY' ? '買進' : '賣出'
    const symbolText = `${order.market} ${order.symbol}`
    const quantityText = formatNumber(order.quantity)
    const orderPriceText = formatCurrency(order.price, order.currency)
    const filledPriceText =
      order.filledPrice === null ? '-' : formatCurrency(order.filledPrice, order.currency)
    const netAmountText = formatCurrency(order.netAmount || order.amount, order.currency)
    const amountText = formatCurrency(order.amount, order.currency)
    const feeTaxText = formatCurrency((order.fee ?? 0) + (order.tax ?? 0), order.currency)
    const amountTitle = `淨額 ${netAmountText} / 成交 ${amountText} / 費稅 ${feeTaxText}`
    const isExpanded = detailState.expandedOrderId === order.id
    const isClosing = detailState.closingOrderId === order.id
    const shouldShowDetail = isExpanded || isClosing

    const summaryRow = (
      <tr
        className={`order-summary-row${isExpanded ? ' is-expanded' : ''}`}
        key={order.id}
        tabIndex={0}
        title="點擊查看委託明細"
        onClick={() => onToggleOrder(order.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onToggleOrder(order.id)
          }
        }}
      >
        <td title={timeText}>{timeText}</td>
        <td title={statusText}>
          <span className={`status-pill ${order.status.toLowerCase()}`}>{statusText}</span>
        </td>
        <td title={typeText}>{typeText}</td>
        <td className={order.side === 'BUY' ? 'price-up' : 'price-down'} title={sideText}>
          {sideText}
        </td>
        <td className="stock-name-cell" title={`${symbolText} ${order.name}`}>
          <strong title={symbolText}>{symbolText}</strong>
          <span title={order.name}>{order.name}</span>
        </td>
        <td title={quantityText}>{quantityText}</td>
        <td title={orderPriceText}>{orderPriceText}</td>
        <td title={filledPriceText}>{filledPriceText}</td>
        <td title={amountTitle}>
          <strong title={netAmountText}>{netAmountText}</strong>
          <span title={`成交 ${amountText} / 費稅 ${feeTaxText}`}>
            成交 {amountText} / 費稅 {feeTaxText}
          </span>
        </td>
        <td title={order.status === 'PENDING' ? '取消委託' : '無可操作'}>
          {order.status === 'PENDING' ? (
            <button
              className="table-action"
              disabled={cancellingOrderId === order.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onCancelOrder(order.id)
              }}
            >
              取消
            </button>
          ) : (
            <span title="無可操作">-</span>
          )}
        </td>
      </tr>
    )

    return shouldShowDetail
      ? [summaryRow, <OrderDetailRow isClosing={isClosing} key={`${order.id}-detail`} order={order} />]
      : [summaryRow]
  })
}

export function DetailModal({
  cancellingOrderId,
  detailModal,
  holdings,
  orders,
  onCancelOrder,
  onClose,
}: DetailModalProps) {
  const [detailState, setDetailState] = useState<OrderDetailState>({
    closingOrderId: null,
    expandedOrderId: null,
  })
  const [showPendingOnly, setShowPendingOnly] = useState(false)

  if (!detailModal) return null

  const visibleOrders =
    detailModal === 'orders' && showPendingOnly
      ? orders.filter((order) => order.status === 'PENDING')
      : orders

  function toggleOrder(orderId: number) {
    setDetailState((current) => {
      if (current.expandedOrderId === orderId) {
        window.setTimeout(() => {
          setDetailState((latest) =>
            latest.closingOrderId === orderId
              ? { closingOrderId: null, expandedOrderId: latest.expandedOrderId }
              : latest,
          )
        }, DETAIL_CLOSE_MS)

        return {
          closingOrderId: orderId,
          expandedOrderId: null,
        }
      }

      return {
        closingOrderId: current.expandedOrderId,
        expandedOrderId: orderId,
      }
    })
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-panel glass-panel"
        role="dialog"
        aria-modal="true"
        aria-label={detailModal === 'holdings' ? '目前持倉' : '交易紀錄'}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <span>{detailModal === 'holdings' ? '目前持倉' : '交易紀錄'}</span>
            <strong>
              {detailModal === 'holdings' ? `${holdings.length} 檔` : `${visibleOrders.length} 筆`}
            </strong>
          </div>
          <div className="modal-actions">
            {detailModal === 'orders' && (
              <div
                className="modal-toggle cash-history-segmented"
                role="group"
                aria-label="交易紀錄篩選"
                style={
                  {
                    '--segment-count': 2,
                    '--active-index': showPendingOnly ? 1 : 0,
                  } as CSSProperties
                }
              >
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
            )}
            <button
              className="modal-icon-button"
              type="button"
              aria-label={detailModal === 'holdings' ? '關閉持倉視窗' : '關閉交易紀錄視窗'}
              title="關閉"
              onClick={onClose}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>
        <div className="table-shell modal-table">
          {detailModal === 'holdings' ? (
            <table className="holdings-table">
              <thead>
                <tr>
                  <th title="股票">股票</th>
                  <th title="持有股數">持有股數</th>
                  <th title="可賣股數">可賣股數</th>
                  <th title="平均成本">平均成本</th>
                  <th title="市值">市值</th>
                  <th title="未實現損益">未實現損益</th>
                </tr>
              </thead>
              <tbody>
                {holdings.length > 0 ? (
                  renderHoldingsRows(holdings)
                ) : (
                  <tr>
                    <td colSpan={6}>目前沒有持倉</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th title="時間">時間</th>
                  <th title="狀態">狀態</th>
                  <th title="類型">類型</th>
                  <th title="方向">方向</th>
                  <th title="股票">股票</th>
                  <th title="數量">數量</th>
                  <th title="委託價">委託價</th>
                  <th title="成交價">成交價</th>
                  <th title="金額">金額</th>
                  <th title="操作">操作</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.length > 0 ? (
                  renderOrderRows(
                    visibleOrders,
                    detailState,
                    cancellingOrderId,
                    onCancelOrder,
                    toggleOrder,
                  )
                ) : (
                  <tr>
                    <td colSpan={10}>{showPendingOnly ? '目前沒有掛單' : '目前沒有交易紀錄'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
