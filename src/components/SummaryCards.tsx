import type { Currency, CurrencyTotal, Market } from '../types'
import { formatCurrency, formatNumber, formatPercent, getMarketLabel } from '../utils/format'

type SummaryCardsProps = {
  selectedCurrency: Currency
  selectedMarket: Market
  selectedTotals: CurrencyTotal
}

export function SummaryCards({
  selectedCurrency,
  selectedMarket,
  selectedTotals,
}: SummaryCardsProps) {
  const totalPnLClass = selectedTotals.totalPnL >= 0 ? 'price-up' : 'price-down'

  return (
    <section className="summary-grid" aria-label="資產摘要">
      <article className="metric-card glass-panel">
        <span>{selectedCurrency} 總資產</span>
        <strong>{formatCurrency(selectedTotals.totalValue, selectedCurrency)}</strong>
        <small className={totalPnLClass}>
          總損益 {formatCurrency(selectedTotals.totalPnL, selectedCurrency)} /{' '}
          {formatPercent(selectedTotals.totalReturnPercent)}
        </small>
      </article>
      <article className="metric-card glass-panel">
        <span>{selectedCurrency} 可用現金</span>
        <strong>{formatCurrency(selectedTotals.cash, selectedCurrency)}</strong>
        {selectedTotals.reservedCash > 0 && (
          <small>凍結 {formatCurrency(selectedTotals.reservedCash, selectedCurrency)}</small>
        )}
      </article>
      <article className="metric-card glass-panel">
        <span>{getMarketLabel(selectedMarket)} 市值</span>
        <strong>{formatCurrency(selectedTotals.marketValue, selectedCurrency)}</strong>
        <small className={selectedTotals.realizedPnL >= 0 ? 'price-up' : 'price-down'}>
          已實現 {formatCurrency(selectedTotals.realizedPnL, selectedCurrency)}
        </small>
      </article>
      <article className="metric-card glass-panel">
        <span>未實現損益</span>
        <strong className={selectedTotals.unrealizedPnL >= 0 ? 'price-up' : 'price-down'}>
          {formatCurrency(selectedTotals.unrealizedPnL, selectedCurrency)}
        </strong>
        <small>
          費稅 {formatCurrency(selectedTotals.cumulativeFee + selectedTotals.cumulativeTax, selectedCurrency)}
          {selectedTotals.pendingOrderCount > 0
            ? ` / 掛單 ${formatNumber(selectedTotals.pendingOrderCount)} 筆`
            : ''}
        </small>
      </article>
    </section>
  )
}
