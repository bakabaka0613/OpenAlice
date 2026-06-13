import { QuoteHeader } from '../../components/market/QuoteHeader'
import { ProfilePanel } from '../../components/market/ProfilePanel'
import { KeyMetricsPanel } from '../../components/market/KeyMetricsPanel'
import { FinancialStatementsPanel } from '../../components/market/FinancialStatementsPanel'
import { KlinePanel } from '../../components/market/KlinePanel'
import { TradeableContractsPanel } from '../../components/market/TradeableContractsPanel'
import { ErrorBoundary } from '../../components/ErrorBoundary'

interface Props {
  symbol: string
}

// Each panel pulls from a different provider endpoint with its own data-shape
// risk, so each gets its own boundary — a thin TWSE name throwing in the chart
// must not take the profile/financials down with it.
export function EquityDetail({ symbol }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <ErrorBoundary label="Quote"><QuoteHeader symbol={symbol} /></ErrorBoundary>

      <div className="h-[360px] shrink-0">
        <ErrorBoundary label="K-line"><KlinePanel selection={{ symbol, assetClass: 'equity' }} /></ErrorBoundary>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ErrorBoundary label="Profile"><ProfilePanel symbol={symbol} /></ErrorBoundary>
        <ErrorBoundary label="Key Metrics"><KeyMetricsPanel symbol={symbol} /></ErrorBoundary>
      </div>

      <ErrorBoundary label="Tradeable Contracts"><TradeableContractsPanel symbol={symbol} assetClass="equity" /></ErrorBoundary>

      <ErrorBoundary label="Financial Statements"><FinancialStatementsPanel symbol={symbol} /></ErrorBoundary>
    </div>
  )
}
