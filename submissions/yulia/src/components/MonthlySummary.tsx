import type { Currency, MonthlySummary as Summary } from '../domain/model'
import { formatMoney } from '../domain/money'

interface MonthlySummaryProps {
  currency: Currency
  summary: Summary
}
export function MonthlySummary({ currency, summary }: MonthlySummaryProps) {
  const categoryEntries = Object.entries(summary.spendingByCategory)

  return (
    <section className="summary-section" aria-labelledby="summary-heading">
      <h2 id="summary-heading" className="visually-hidden">
        Summary
      </h2>
      <div className="summary-grid">
        <SummaryValue
          label="Income"
          value={formatMoney(summary.incomeMinor, currency)}
          tone="positive"
        />
        <SummaryValue
          label="Expenses"
          value={formatMoney(summary.expensesMinor, currency)}
          tone="negative"
        />
        <SummaryValue
          label="Balance"
          value={formatMoney(summary.balanceMinor, currency)}
          tone="balance"
        />
      </div>

      <section className="panel category-summary" aria-labelledby="category-heading">
        <div>
          <p className="eyebrow">Expense breakdown</p>
          <h2 id="category-heading">Spending by category</h2>
        </div>
        {categoryEntries.length === 0 ? (
          <p className="empty-copy">No expense categories this month.</p>
        ) : (
          <dl className="category-list">
            {categoryEntries.map(([category, amount]) => (
              <div key={category}>
                <dt>{category}</dt>
                <dd>{formatMoney(amount, currency)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </section>
  )
}

interface SummaryValueProps {
  label: string
  value: string
  tone: 'positive' | 'negative' | 'balance'
}

function SummaryValue({ label, value, tone }: SummaryValueProps) {
  return (
    <article className={`summary-card summary-card--${tone}`}>
      <p>{label}</p>
      <output aria-label={`Total ${label.toLowerCase()}`}>{value}</output>
    </article>
  )
}
