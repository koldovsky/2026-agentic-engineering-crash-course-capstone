import type { Currency, Transaction } from '../domain/model'
import { formatMoney } from '../domain/money'

interface TransactionListProps {
  currency: Currency
  transactions: readonly Transaction[]
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
}
export function TransactionList({
  currency,
  transactions,
  onEdit,
  onDelete,
}: TransactionListProps) {
  return (
    <section className="panel" aria-labelledby="transactions-heading">
      <p className="eyebrow">Selected month</p>
      <h2 id="transactions-heading">Transactions</h2>

      {transactions.length === 0 ? (
        <p className="empty-copy">No transactions this month.</p>
      ) : (
        <ul className="transaction-list">
          {transactions.map((transaction) => (
            <li key={transaction.id}>
              <div>
                <strong>{transaction.type === 'income' ? 'Income' : 'Expense'}</strong>
                {transaction.type === 'expense' ? (
                  <span>{transaction.category}</span>
                ) : null}
                <span>{transaction.date}</span>
              </div>
              <div className="transaction-row-end">
                <span
                  className={`transaction-amount transaction-amount--${transaction.type}`}
                >
                  {transaction.type === 'income' ? '+' : '−'}
                  {formatMoney(transaction.amountMinor, currency)}
                </span>
                <div className="transaction-actions">
                  <button
                    type="button"
                    className="button-secondary button-compact"
                    onClick={() => onEdit(transaction)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="button-danger button-compact"
                    onClick={() => onDelete(transaction)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
