import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, UIEvent } from 'react'
import type { Currency, Market, StockListItem, StockQuote } from '../types'
import { formatCurrency, getMarketLabel } from '../utils/format'

type StockListPanelProps = {
  activeMarket: Market
  filteredStocks: StockListItem[]
  isMobileLayout: boolean
  isStockListLoading: Record<Market, boolean>
  quote: StockQuote | null
  selectedCurrency: Currency
  selectedMarket: Market
  symbolInput: string
  twStockCount: number
  usStockCount: number
  visibleStocks: StockListItem[]
  onLoadMore: () => void
  onMarketChange: (market: Market) => void
  onScroll: (event: UIEvent<HTMLDivElement>) => void
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void
  onSymbolInputChange: (value: string) => void
  onSymbolSelect: (market: Market, symbol: string, updateInput?: boolean) => void
}

export function StockListPanel({
  activeMarket,
  filteredStocks,
  isMobileLayout,
  isStockListLoading,
  quote,
  selectedCurrency,
  selectedMarket,
  symbolInput,
  twStockCount,
  usStockCount,
  visibleStocks,
  onLoadMore,
  onMarketChange,
  onScroll,
  onSearchSubmit,
  onSymbolInputChange,
  onSymbolSelect,
}: StockListPanelProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const comboboxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isMobileLayout) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!comboboxRef.current?.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isMobileLayout])

  const metaText = selectedMarket === 'TW' ? `台股 ${twStockCount} 檔` : `美股 ${usStockCount} 檔`
  const resultText =
    filteredStocks.length > 0
      ? `顯示 ${visibleStocks.length} / ${filteredStocks.length} 檔`
      : '沒有符合條件的標的'
  const dropdownId = `stock-dropdown-${selectedMarket.toLowerCase()}`
  const shouldShowDropdown = isMobileLayout && isDropdownOpen
  const isCurrentMarketActive = activeMarket === selectedMarket

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    onSearchSubmit(event)
    setIsDropdownOpen(false)
  }

  function handleSelect(symbol: string) {
    onSymbolSelect(selectedMarket, symbol)
    setIsDropdownOpen(false)
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsDropdownOpen(false)
    }
  }

  function handleDropdownScroll(event: UIEvent<HTMLDivElement>) {
    const element = event.currentTarget
    const isNearBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 24

    if (!isNearBottom || visibleStocks.length >= filteredStocks.length) {
      return
    }

    onLoadMore()
  }

  return (
    <aside className="watch-panel glass-panel">
      <div className="panel-heading">
        <span>行情查詢</span>
        {quote && <strong>{quote.name}</strong>}
      </div>

      <div className="market-tabs" role="group" aria-label="市場切換">
        <button
          className={selectedMarket === 'TW' ? 'active' : ''}
          type="button"
          onClick={() => onMarketChange('TW')}
        >
          台股
        </button>
        <button
          className={selectedMarket === 'US' ? 'active' : ''}
          type="button"
          onClick={() => onMarketChange('US')}
        >
          美股
        </button>
      </div>

      <div className={`symbol-combobox${shouldShowDropdown ? ' is-open' : ''}`} ref={comboboxRef}>
        <form className="symbol-form" onSubmit={handleSubmit}>
          <input
            aria-controls={shouldShowDropdown ? dropdownId : undefined}
            aria-expanded={shouldShowDropdown}
            aria-haspopup="listbox"
            autoComplete="off"
            inputMode="text"
            onChange={(event) => {
              onSymbolInputChange(event.target.value)
              if (isMobileLayout) {
                setIsDropdownOpen(true)
              }
            }}
            onFocus={() => {
              if (isMobileLayout) {
                setIsDropdownOpen(true)
              }
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={
              selectedMarket === 'TW'
                ? '輸入台股代號，例如 2330'
                : '輸入美股代號，例如 NVDA'
            }
            value={symbolInput}
          />
          <button type="submit">查詢</button>
        </form>

        {shouldShowDropdown && (
          <div
            className="stock-dropdown"
            id={dropdownId}
            role="listbox"
            aria-label="股票候選清單"
            onScroll={handleDropdownScroll}
          >
            {isStockListLoading[selectedMarket] && (
              <p className="list-state">{getMarketLabel(selectedMarket)}列表載入中...</p>
            )}

            {!isStockListLoading[selectedMarket] && filteredStocks.length === 0 && (
              <p className="list-state">找不到符合條件的股票</p>
            )}

            {!isStockListLoading[selectedMarket] &&
              visibleStocks.map((item) => {
                const isActive = isCurrentMarketActive && quote?.symbol === item.symbol

                return (
                  <button
                    aria-selected={isActive}
                    className={isActive ? 'active' : ''}
                    key={item.symbol}
                    role="option"
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(item.symbol)}
                  >
                    <span>
                      <strong>{item.symbol}</strong>
                      <small>{item.name}</small>
                    </span>
                    <em>
                      {selectedMarket === 'US'
                        ? (item.exchange ?? 'US')
                        : item.close
                          ? formatCurrency(item.close, selectedCurrency)
                          : getMarketLabel(selectedMarket)}
                    </em>
                  </button>
                )
              })}
          </div>
        )}
      </div>

      {isMobileLayout && (
        <div className="stock-list-meta mobile-stock-meta">
          <span>{metaText}</span>
          <strong>{resultText}</strong>
        </div>
      )}

      {!isMobileLayout && (
        <>
          <div className="stock-list-meta">
            <span>{metaText}</span>
            <strong>{resultText}</strong>
          </div>

          <div
            className={`stock-list ${selectedMarket === 'TW' ? 'tw-list' : 'us-list'}`}
            aria-label="股票列表"
            onScroll={onScroll}
          >
            {isStockListLoading[selectedMarket] && (
              <p className="list-state">{getMarketLabel(selectedMarket)}列表載入中...</p>
            )}

            {!isStockListLoading[selectedMarket] && filteredStocks.length === 0 && (
              <p className="list-state">找不到符合條件的股票</p>
            )}

            {!isStockListLoading[selectedMarket] &&
              visibleStocks.map((item) => {
                const isActive = isCurrentMarketActive && quote?.symbol === item.symbol

                return (
                  <button
                    className={isActive ? 'active' : ''}
                    key={item.symbol}
                    type="button"
                    onClick={() => onSymbolSelect(selectedMarket, item.symbol, false)}
                  >
                    <span>
                      <strong>{item.symbol}</strong>
                      <small>{item.name}</small>
                    </span>
                    <em>
                      {selectedMarket === 'US'
                        ? (item.exchange ?? 'US')
                        : item.close
                          ? formatCurrency(item.close, selectedCurrency)
                          : getMarketLabel(selectedMarket)}
                    </em>
                  </button>
                )
              })}

            {!isStockListLoading[selectedMarket] && visibleStocks.length < filteredStocks.length && (
              <p className="list-state subtle">往下捲動可載入更多</p>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
