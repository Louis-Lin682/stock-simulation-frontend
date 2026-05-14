import type { FormEvent } from 'react'
import type { Currency, Market, OrderSide, OrderType, StockQuote } from '../types'
import { formatCurrency, getMarketLabel } from '../utils/format'
import { LoadingRing } from './LoadingRing'

type OrderPanelProps = {
  estimatedAmount: number
  estimatedFee: number
  estimatedNetAmount: number
  estimatedPrice: number
  estimatedTax: number
  isMobileLayout: boolean
  isOrderLoading: boolean
  limitPriceInput: string
  market: Market
  orderSide: OrderSide
  orderType: OrderType
  progress: number
  quantity: number
  quote: StockQuote | null
  selectedCurrency: Currency
  onLimitPriceBlur: () => void
  onLimitPriceChange: (price: string) => void
  onOpenCalendar: () => void
  onOrderSideChange: (side: OrderSide) => void
  onOrderTypeChange: (type: OrderType) => void
  onQuantityChange: (quantity: number) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function OrderPanel({
  estimatedAmount,
  estimatedFee,
  estimatedNetAmount,
  estimatedPrice,
  estimatedTax,
  isMobileLayout,
  isOrderLoading,
  limitPriceInput,
  market,
  orderSide,
  orderType,
  progress,
  quantity,
  quote,
  selectedCurrency,
  onLimitPriceBlur,
  onLimitPriceChange,
  onOpenCalendar,
  onOrderSideChange,
  onOrderTypeChange,
  onQuantityChange,
  onSubmit,
}: OrderPanelProps) {
  const marketLabel = getMarketLabel(market)
  const reservationHint =
    market === 'TW'
      ? '台股收盤後送出的限價單會先保留為預約單，並依 TWSE 休市日曆在下一個交易日生效。'
      : '美股休市或收盤後送出的委託會依 NYSE 交易日曆順延到下一個交易時段處理。'

  return (
    <aside className="order-panel glass-panel">
      <div className="panel-heading">
        <span>模擬下單</span>
        <strong>{orderSide === 'BUY' ? '買進' : '賣出'}</strong>
      </div>

      <div className={`order-shell${quote ? '' : ' is-disabled'}`}>
        <form className="order-form" onSubmit={onSubmit}>
          <div className="segmented">
            <button
              className={orderSide === 'BUY' ? 'active buy' : 'buy'}
              disabled={!quote}
              type="button"
              onClick={() => onOrderSideChange('BUY')}
            >
              買進
            </button>
            <button
              className={orderSide === 'SELL' ? 'active sell' : 'sell'}
              disabled={!quote}
              type="button"
              onClick={() => onOrderSideChange('SELL')}
            >
              賣出
            </button>
          </div>

          <div className="segmented order-type-toggle">
            <button
              className={orderType === 'MARKET' ? 'active neutral' : ''}
              disabled={!quote}
              type="button"
              onClick={() => onOrderTypeChange('MARKET')}
            >
              市價
            </button>
            <button
              className={orderType === 'LIMIT' ? 'active neutral' : ''}
              disabled={!quote}
              type="button"
              onClick={() => onOrderTypeChange('LIMIT')}
            >
              限價
            </button>
          </div>

          <label>
            <span>{orderType === 'MARKET' ? '市價' : '限價'}</span>
            <input
              disabled={!quote || orderType === 'MARKET'}
              inputMode="decimal"
              onBlur={onLimitPriceBlur}
              onChange={(event) => onLimitPriceChange(event.target.value)}
              placeholder="0.00"
              type="text"
              value={orderType === 'MARKET' ? estimatedPrice.toFixed(2) : limitPriceInput}
            />
          </label>

          <label>
            <span>數量</span>
            <input
              disabled={!quote}
              min={1}
              onChange={(event) => onQuantityChange(Number(event.target.value))}
              type="number"
              value={quantity}
            />
          </label>

          <dl className="order-preview">
            <div>
              <dt>{orderType === 'MARKET' ? '預估成交價' : '委託價格'}</dt>
              <dd>{formatCurrency(estimatedPrice, selectedCurrency)}</dd>
            </div>
            <div>
              <dt>預估金額</dt>
              <dd>{formatCurrency(estimatedAmount, selectedCurrency)}</dd>
            </div>
            <div>
              <dt>手續費</dt>
              <dd>{formatCurrency(estimatedFee, selectedCurrency)}</dd>
            </div>
            <div>
              <dt>交易稅</dt>
              <dd>{formatCurrency(estimatedTax, selectedCurrency)}</dd>
            </div>
            <div className="order-total-row">
              <dt>{orderSide === 'BUY' ? '預估扣款' : '預估入帳'}</dt>
              <dd>{formatCurrency(estimatedNetAmount, selectedCurrency)}</dd>
            </div>
          </dl>

          {isMobileLayout && (
            <div className="order-rule-card">
              <div className="order-rule-heading">
                <span>交易規則</span>
                <button className="order-calendar-button" type="button" onClick={onOpenCalendar}>
                  {marketLabel}交易日曆
                </button>
              </div>
              <p>{reservationHint}</p>
            </div>
          )}

          <button className="primary-button" disabled={!quote || isOrderLoading} type="submit">
            {isOrderLoading ? (
              <LoadingRing label="送出委託" progress={progress} size="sm" />
            ) : (
              '送出委託'
            )}
          </button>
        </form>

        {!quote && <div className="disabled-mask" aria-hidden="true" />}
      </div>
    </aside>
  )
}
