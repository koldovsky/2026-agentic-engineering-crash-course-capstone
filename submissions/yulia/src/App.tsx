import { useMemo, useState } from 'react'

import { CurrencySetup } from './components/CurrencySetup'
import { MonthlySummary } from './components/MonthlySummary'
import {
  TransactionForm,
  type NewTransactionInput,
  type SubmissionResult,
} from './components/TransactionForm'
import { TransactionList } from './components/TransactionList'
import type { Currency } from './domain/model'
import {
  addTransaction,
  filterTransactionsByMonth,
  summarizeMonth,
  validateTransactionInput,
} from './domain/transactions'
import {
  loadState,
  saveState,
  SCHEMA_VERSION,
  type PersistedState,
  type StorageAdapter,
} from './storage'
import './styles.css'

interface AppProps {
  storage?: StorageAdapter
  now?: Date
  createTransactionId?: () => string
}

export function App({
  storage = window.localStorage,
  now = new Date(),
  createTransactionId = () => crypto.randomUUID(),
}: AppProps) {
  const [initialLoad] = useState(() => loadState(storage))
  const [persistedState, setPersistedState] = useState<PersistedState | null>(() =>
    initialLoad.status === 'loaded' ? initialLoad.state : null,
  )
  const [selectedMonth, setSelectedMonth] = useState(() => monthFromDate(now))
  const [storageError, setStorageError] = useState<string | null>(() =>
    initialLoad.status === 'unavailable'
      ? 'Browser storage is unavailable. Varto cannot safely save your data.'
      : null,
  )
  const recoveryNotice =
    initialLoad.status === 'recovered'
      ? 'Unreadable saved data was cleared. Choose a currency to start again.'
      : null

  const selectedTransactions = useMemo(
    () =>
      filterTransactionsByMonth(
        persistedState?.transactions ?? [],
        selectedMonth,
      ),
    [persistedState, selectedMonth],
  )
  const summary = useMemo(
    () => summarizeMonth(persistedState?.transactions ?? [], selectedMonth),
    [persistedState, selectedMonth],
  )

  function handleCurrencySelected(currency: Currency): void {
    const nextState: PersistedState = {
      schemaVersion: SCHEMA_VERSION,
      currency,
      transactions: [],
    }
    const result = saveState(storage, nextState)

    if (!result.ok) {
      setStorageError('Varto could not save your currency. No changes were kept.')
      return
    }

    setStorageError(null)
    setPersistedState(nextState)
  }

  function handleAddTransaction(input: NewTransactionInput): SubmissionResult {
    if (!persistedState) {
      return { ok: false, formError: 'Choose a currency before adding transactions.' }
    }

    const validation = validateTransactionInput({
      ...input,
      id: createTransactionId(),
    })

    if (!validation.ok) {
      return { ok: false, errors: validation.errors }
    }

    const change = addTransaction(
      persistedState.transactions,
      validation.value,
    )

    if (!change.ok) {
      return {
        ok: false,
        errors: {
          amount: 'This amount would make the monthly totals too large.',
        },
      }
    }

    const nextState: PersistedState = {
      ...persistedState,
      transactions: change.value,
    }
    const saveResult = saveState(storage, nextState)

    if (!saveResult.ok) {
      setStorageError('Varto could not save this transaction. No changes were kept.')
      return { ok: false, formError: 'The transaction could not be saved.' }
    }

    setStorageError(null)
    setPersistedState(nextState)
    return { ok: true }
  }

  if (initialLoad.status === 'unavailable') {
    return (
      <main className="app-shell app-shell--centered">
        <section className="panel setup-panel" aria-labelledby="storage-title">
          <p className="eyebrow">Varto</p>
          <h1 id="storage-title">Storage unavailable</h1>
          <p role="alert">{storageError}</p>
          <p>Enable browser storage and reload to use Varto.</p>
        </section>
      </main>
    )
  }

  if (!persistedState) {
    return (
      <main className="app-shell app-shell--centered">
        <CurrencySetup
          notice={recoveryNotice}
          error={storageError}
          onSelect={handleCurrencySelected}
        />
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Personal finance, kept local</p>
          <h1>Varto</h1>
        </div>
        <span className="currency-badge" aria-label="Application currency">
          {persistedState.currency}
        </span>
      </header>

      {storageError ? (
        <p className="notice notice--error" role="alert">
          {storageError}
        </p>
      ) : null}

      <section className="month-control panel" aria-labelledby="month-heading">
        <div>
          <p className="eyebrow">Review period</p>
          <h2 id="month-heading">Monthly overview</h2>
        </div>
        <label>
          Month
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />
        </label>
      </section>

      <MonthlySummary
        currency={persistedState.currency}
        summary={summary}
      />

      <div className="content-grid">
        <TransactionForm onSubmit={handleAddTransaction} />
        <TransactionList
          currency={persistedState.currency}
          transactions={selectedTransactions}
        />
      </div>
    </main>
  )
}

function monthFromDate(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  return `${year}-${month}`
}

