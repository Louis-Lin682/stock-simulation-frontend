import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'
import type { CashTransaction, Currency } from '../types'
import { formatCurrency, formatDateTime } from '../utils/format'

type CashHistoryModalProps = {
  cashTransactions: CashTransaction[]
  isMobileLayout: boolean
  selectedCurrency: Currency
  onClose: () => void
}

type CashHistoryFilter = 'ALL' | 'IN' | 'OUT' | 'MIGRATION'
type CashHistoryRange = '7D' | '30D' | '180D' | 'ALL'

const TYPE_OPTIONS: Array<{ value: CashHistoryFilter; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'IN', label: '轉入' },
  { value: 'OUT', label: '轉出' },
  { value: 'MIGRATION', label: '搬移' },
]

const RANGE_OPTIONS: Array<{ value: CashHistoryRange; label: string }> = [
  { value: '7D', label: '近 7 天' },
  { value: '30D', label: '近 30 天' },
  { value: '180D', label: '近半年' },
  { value: 'ALL', label: '全部' },
]

function getCashTransactionTypeLabel(type: CashTransaction['type']) {
  if (type === 'BANK_TO_BROKER') return '銀行轉入證券戶'
  if (type === 'BROKER_TO_BANK') return '證券戶轉回銀行'
  if (type === 'BROKER_TO_BANK_MIGRATION') return '舊資金搬移至銀行'
  return type
}

function getAmountClass(type: CashTransaction['type']) {
  return type === 'BROKER_TO_BANK' || type === 'BROKER_TO_BANK_MIGRATION'
    ? 'price-down'
    : 'price-up'
}

function getAmountText(transaction: CashTransaction) {
  const sign =
    transaction.type === 'BROKER_TO_BANK' || transaction.type === 'BROKER_TO_BANK_MIGRATION'
      ? '-'
      : '+'

  return `${sign}${formatCurrency(transaction.amount, transaction.currency)}`
}

function getNoteText(transaction: CashTransaction) {
  return transaction.note?.trim() || '無備註'
}

function matchesTypeFilter(transaction: CashTransaction, filter: CashHistoryFilter) {
  if (filter === 'ALL') return true
  if (filter === 'IN') return transaction.type === 'BANK_TO_BROKER'
  if (filter === 'OUT') return transaction.type === 'BROKER_TO_BANK'
  return transaction.type === 'BROKER_TO_BANK_MIGRATION'
}

function matchesRangeFilter(transaction: CashTransaction, range: CashHistoryRange) {
  if (range === 'ALL') return true

  const createdAt = new Date(transaction.createdAt).getTime()

  if (!Number.isFinite(createdAt)) {
    return false
  }

  const days = range === '7D' ? 7 : range === '30D' ? 30 : 180
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000

  return createdAt >= cutoff
}

function getSegmentStyle(optionCount: number, activeIndex: number) {
  return {
    '--segment-count': optionCount,
    '--active-index': activeIndex,
  } as CSSProperties
}

function renderDesktopRows(items: CashTransaction[]) {
  return items.map((transaction) => (
    <tr key={transaction.id}>
      <td title={formatDateTime(transaction.createdAt)}>{formatDateTime(transaction.createdAt)}</td>
      <td title={transaction.currency}>{transaction.currency}</td>
      <td title={getCashTransactionTypeLabel(transaction.type)}>
        {getCashTransactionTypeLabel(transaction.type)}
      </td>
      <td className={getAmountClass(transaction.type)} title={getAmountText(transaction)}>
        {getAmountText(transaction)}
      </td>
      <td title={formatCurrency(transaction.bankCashBefore, transaction.currency)}>
        {formatCurrency(transaction.bankCashBefore, transaction.currency)}
      </td>
      <td title={formatCurrency(transaction.bankCashAfter, transaction.currency)}>
        {formatCurrency(transaction.bankCashAfter, transaction.currency)}
      </td>
      <td title={formatCurrency(transaction.brokerCashBefore, transaction.currency)}>
        {formatCurrency(transaction.brokerCashBefore, transaction.currency)}
      </td>
      <td title={formatCurrency(transaction.brokerCashAfter, transaction.currency)}>
        {formatCurrency(transaction.brokerCashAfter, transaction.currency)}
      </td>
      <td title={getNoteText(transaction)}>{getNoteText(transaction)}</td>
    </tr>
  ))
}

function renderMobileCards(items: CashTransaction[]) {
  return items.map((transaction) => (
    <article className="cash-history-card glass-panel" key={transaction.id}>
      <div className="cash-history-card-head">
        <div className="cash-history-card-title">
          <span>{transaction.currency}</span>
          <strong>{getCashTransactionTypeLabel(transaction.type)}</strong>
        </div>
        <b className={getAmountClass(transaction.type)}>{getAmountText(transaction)}</b>
      </div>

      <div className="cash-history-card-grid">
        <div>
          <span>銀行帳戶</span>
          <strong>
            {formatCurrency(transaction.bankCashBefore, transaction.currency)} {'->'}{' '}
            {formatCurrency(transaction.bankCashAfter, transaction.currency)}
          </strong>
        </div>
        <div>
          <span>證券戶餘額</span>
          <strong>
            {formatCurrency(transaction.brokerCashBefore, transaction.currency)} {'->'}{' '}
            {formatCurrency(transaction.brokerCashAfter, transaction.currency)}
          </strong>
        </div>
      </div>

      <div className="cash-history-card-foot">
        <span>{formatDateTime(transaction.createdAt)}</span>
        <small title={getNoteText(transaction)}>{getNoteText(transaction)}</small>
      </div>
    </article>
  ))
}

export function CashHistoryModal({
  cashTransactions,
  isMobileLayout,
  selectedCurrency,
  onClose,
}: CashHistoryModalProps) {
  const [activeFilter, setActiveFilter] = useState<CashHistoryFilter>('ALL')
  const [activeRange, setActiveRange] = useState<CashHistoryRange>('ALL')

  const filteredTransactions = useMemo(
    () =>
      cashTransactions.filter(
        (item) =>
          item.currency === selectedCurrency &&
          matchesTypeFilter(item, activeFilter) &&
          matchesRangeFilter(item, activeRange),
      ),
    [activeFilter, activeRange, cashTransactions, selectedCurrency],
  )

  const activeTypeIndex = TYPE_OPTIONS.findIndex((option) => option.value === activeFilter)
  const activeRangeIndex = RANGE_OPTIONS.findIndex((option) => option.value === activeRange)

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className={`modal-panel glass-panel cash-history-modal${isMobileLayout ? ' is-mobile' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="資金轉帳紀錄"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-heading cash-history-heading">
          <div className="cash-history-title-block">
            <span>資金轉帳紀錄</span>
            <strong>
              {selectedCurrency} {filteredTransactions.length} 筆
            </strong>
            <p>檢視銀行與證券戶之間的資金移動，以及每次異動前後的餘額變化。</p>
          </div>
          <div className="modal-actions">
            <button
              className="modal-icon-button"
              type="button"
              aria-label="關閉資金紀錄"
              title="關閉"
              onClick={onClose}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>

        <div className="cash-history-toolbar glass-panel">
          <div className="cash-history-filter-stack">
            <div className="cash-history-filter-group">
              <span className="cash-history-filter-label">類型</span>
              <div
                className="cash-history-segmented"
                role="group"
                aria-label="資金紀錄類型篩選"
                style={getSegmentStyle(TYPE_OPTIONS.length, activeTypeIndex)}
              >
                {TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={activeFilter === option.value ? 'active' : ''}
                    type="button"
                    onClick={() => setActiveFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="cash-history-filter-group">
              <span className="cash-history-filter-label">時間</span>
              <div
                className="cash-history-segmented"
                role="group"
                aria-label="資金紀錄時間範圍篩選"
                style={getSegmentStyle(RANGE_OPTIONS.length, activeRangeIndex)}
              >
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={activeRange === option.value ? 'active' : ''}
                    type="button"
                    onClick={() => setActiveRange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isMobileLayout ? (
          <div className="cash-history-mobile-list">
            {filteredTransactions.length === 0 ? (
              <p className="list-state">目前沒有符合條件的資金紀錄</p>
            ) : (
              renderMobileCards(filteredTransactions)
            )}
          </div>
        ) : (
          <div className="table-shell modal-table">
            <table className="cash-history-table">
              <thead>
                <tr>
                  <th>時間</th>
                  <th>幣別</th>
                  <th>類型</th>
                  <th>金額</th>
                  <th>銀行前</th>
                  <th>銀行後</th>
                  <th>證券前</th>
                  <th>證券後</th>
                  <th>備註</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9}>目前沒有符合條件的資金紀錄</td>
                  </tr>
                ) : (
                  renderDesktopRows(filteredTransactions)
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
