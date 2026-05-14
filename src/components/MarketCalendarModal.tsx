import type { Market, MarketCalendar } from '../types'
import { formatDateLabel, getMarketLabel } from '../utils/format'

type MarketCalendarModalProps = {
  calendar: MarketCalendar | null
  isLoading: boolean
  market: Market
  onClose: () => void
}

export function MarketCalendarModal({
  calendar,
  isLoading,
  market,
  onClose,
}: MarketCalendarModalProps) {
  const marketLabel = getMarketLabel(market)
  const holidays = calendar?.holidays ?? []
  const description =
    market === 'TW'
      ? '台股依 TWSE 官方休市表判斷收盤後的預約單與次一交易日生效時間。'
      : '美股依 NYSE 官方休市表判斷預約單與休市順延，正式盤時間以當地市場為準。'
  const sourceLabel =
    calendar?.source ?? (market === 'TW' ? 'TWSE holiday schedule' : 'NYSE holiday schedule')

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-labelledby="market-calendar-title"
        aria-modal="true"
        className="modal-panel calendar-modal glass-panel"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-heading calendar-heading">
          <div className="calendar-title-block">
            <span>交易日曆</span>
            <strong id="market-calendar-title">
              {marketLabel} {calendar?.year ?? new Date().getFullYear()} 休市表
            </strong>
            <p>{description}</p>
          </div>
          <button
            aria-label="關閉交易日曆"
            className="modal-icon-button"
            type="button"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="calendar-summary glass-panel">
          <div>
            <span>資料來源</span>
            <strong>{sourceLabel}</strong>
          </div>
          <div>
            <span>休市天數</span>
            <strong>{calendar ? holidays.length : 0} 天</strong>
          </div>
        </div>

        <div className="calendar-list">
          {isLoading ? (
            <p className="list-state">交易日曆載入中...</p>
          ) : holidays.length === 0 ? (
            <p className="list-state">目前沒有可顯示的休市資料</p>
          ) : (
            <div className="calendar-grid">
              {holidays.map((holiday) => (
                <article className="calendar-card" key={holiday}>
                  <span>{holiday}</span>
                  <strong>{formatDateLabel(holiday)}</strong>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
