import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Currency, Market, StockQuote } from '../types'
import { formatCurrency, formatNumber, getMarketLabel } from '../utils/format'
import { LoadingRing } from './LoadingRing'

type ChartPoint = {
  date: string
  close: number
}

type ChartPanelProps = {
  activeMarket: Market
  chartData: ChartPoint[]
  isLoading: boolean
  progress: number
  quote: StockQuote | null
  selectedCurrency: Currency
  selectedSymbol: string
}

function formatChartPrice(value: number, currency: Currency) {
  if (currency === 'USD') {
    return value.toFixed(2)
  }

  return value >= 1000 ? value.toFixed(0) : value.toFixed(2)
}

function formatChartTooltipPrice(value: number, currency: Currency) {
  if (currency === 'USD') {
    return `${currency} ${value.toFixed(3)}`
  }

  return formatCurrency(value, currency)
}

export function ChartPanel({
  activeMarket,
  chartData,
  isLoading,
  progress,
  quote,
  selectedCurrency,
  selectedSymbol,
}: ChartPanelProps) {
  return (
    <section className="chart-panel glass-panel">
      <div className="panel-heading">
        <span>六個月走勢</span>
        <strong>
          {quote
            ? `${getMarketLabel(activeMarket)} ${selectedSymbol} ${quote.name}`
            : '請先選擇標的'}
        </strong>
      </div>
      <div className="chart-box">
        {isLoading ? (
          <div className="empty-chart">
            <LoadingRing label="同步行情" progress={progress} size="lg" />
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="closeGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#2ce8f0" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#2ce8f0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(214, 248, 250, 0.12)" vertical={false} />
              <XAxis dataKey="date" stroke="rgba(214, 248, 250, 0.58)" tickLine={false} />
              <YAxis
                domain={['dataMin', 'dataMax']}
                stroke="rgba(214, 248, 250, 0.58)"
                tickFormatter={(value: number) => formatChartPrice(value, selectedCurrency)}
                tickLine={false}
                width={selectedCurrency === 'USD' ? 58 : 52}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(3, 16, 24, 0.92)',
                  border: '1px solid rgba(191, 255, 251, 0.34)',
                  borderRadius: 6,
                  color: '#e7f8ff',
                }}
                formatter={(value) => [
                  formatChartTooltipPrice(Number(value), selectedCurrency),
                  '收盤價',
                ]}
              />
              <Area
                dataKey="close"
                fill="url(#closeGradient)"
                stroke="#2ce8f0"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-chart">
            <strong>請從股票列表選擇一檔標的</strong>
            <span>也可以輸入股票代號搜尋後載入行情</span>
          </div>
        )}
      </div>
      <div className="quote-strip" aria-label="行情摘要">
        <div>
          <span>最新價格</span>
          <strong>
            {quote?.close ? formatCurrency(quote.close, quote.currency ?? selectedCurrency) : '--'}
          </strong>
        </div>
        <div>
          <span>漲跌</span>
          <strong className={(quote?.change ?? 0) >= 0 ? 'price-up' : 'price-down'}>
            {quote ? quote.change : '--'}
          </strong>
        </div>
        <div>
          <span>成交量</span>
          <strong>{quote ? formatNumber(quote.tradeVolume) : '--'}</strong>
        </div>
      </div>
    </section>
  )
}
