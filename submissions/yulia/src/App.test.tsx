import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { App } from './App'
import {
  SCHEMA_VERSION,
  STORAGE_KEY,
  type StorageAdapter,
} from './storage'

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

const NOW = new Date(2026, 0, 15, 12)

function renderApp(storage = new MemoryStorage()) {
  let id = 0
  const view = render(
    <App
      storage={storage}
      now={NOW}
      createTransactionId={() => `transaction-${++id}`}
    />,
  )

  return { storage, ...view }
}

async function completeSetup(currency = 'USD') {
  const user = userEvent.setup()
  await user.selectOptions(screen.getByLabelText('Currency'), currency)
  await user.click(screen.getByRole('button', { name: 'Start tracking' }))
  return user
}

async function addExpense(
  user: ReturnType<typeof userEvent.setup>,
  { amount = '25.50', date = '2026-01-10', category = 'Groceries' } = {},
) {
  await user.clear(screen.getByLabelText('Amount'))
  await user.type(screen.getByLabelText('Amount'), amount)
  await user.clear(screen.getByLabelText('Date'))
  await user.type(screen.getByLabelText('Date'), date)
  await user.selectOptions(screen.getByLabelText('Category'), category)
  await user.click(screen.getByRole('button', { name: 'Add transaction' }))
}

describe('Varto application', () => {
  it('requires initial currency setup, persists it, and does not offer a change control', async () => {
    const { storage, unmount } = renderApp()
    await completeSetup('EUR')

    expect(screen.getByLabelText('Application currency')).toHaveTextContent('EUR')
    expect(screen.queryByLabelText('Currency')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Month')).toHaveValue('2026-01')

    const stored = JSON.parse(storage.values.get(STORAGE_KEY) ?? '{}')
    expect(stored).toEqual({
      schemaVersion: SCHEMA_VERSION,
      currency: 'EUR',
      transactions: [],
    })

    unmount()
    renderApp(storage)

    expect(screen.getByLabelText('Application currency')).toHaveTextContent('EUR')
    expect(screen.queryByLabelText('Currency')).not.toBeInTheDocument()
  })

  it('adds an expense and updates the list, summary, category, and persisted state', async () => {
    const { storage, unmount } = renderApp()
    const user = await completeSetup()

    await addExpense(user)

    expect(screen.getByLabelText('Total income')).toHaveTextContent('USD 0.00')
    expect(screen.getByLabelText('Total expenses')).toHaveTextContent('USD 25.50')
    expect(screen.getByLabelText('Total balance')).toHaveTextContent('−USD 25.50')
    expect(screen.getByRole('list')).toHaveTextContent('Groceries')
    expect(screen.getByRole('list')).toHaveTextContent('2026-01-10')

    const breakdown = screen
      .getByRole('heading', { name: 'Spending by category' })
      .closest('section')
    expect(breakdown).not.toBeNull()
    expect(within(breakdown as HTMLElement).getByText('Groceries')).toBeInTheDocument()
    expect(within(breakdown as HTMLElement).getByText('USD 25.50')).toBeInTheDocument()

    const stored = JSON.parse(storage.values.get(STORAGE_KEY) ?? '{}')
    expect(stored.transactions).toHaveLength(1)
    expect(stored.transactions[0]).toMatchObject({
      type: 'expense',
      amountMinor: 2550,
      date: '2026-01-10',
      category: 'Groceries',
    })

    unmount()
    renderApp(storage)

    expect(screen.getByLabelText('Total expenses')).toHaveTextContent('USD 25.50')
    expect(screen.getByRole('list')).toHaveTextContent('Groceries')
  })

  it('adds income without exposing or storing an expense category', async () => {
    const { storage } = renderApp()
    const user = await completeSetup()

    await user.click(screen.getByLabelText('Income'))
    expect(screen.queryByLabelText('Category')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Amount'), '1000')
    await user.type(screen.getByLabelText('Date'), '2026-01-05')
    await user.click(screen.getByRole('button', { name: 'Add transaction' }))

    expect(screen.getByLabelText('Total income')).toHaveTextContent('USD 1,000.00')
    expect(screen.getByLabelText('Total expenses')).toHaveTextContent('USD 0.00')
    expect(screen.getByLabelText('Total balance')).toHaveTextContent('USD 1,000.00')
    expect(screen.getByRole('list')).toHaveTextContent('Income')

    const stored = JSON.parse(storage.values.get(STORAGE_KEY) ?? '{}')
    expect(stored.transactions[0]).not.toHaveProperty('category')
  })

  it.each([
    ['', 'Amount is required'],
    ['words', 'Amount must be a positive number'],
    ['0', 'Amount must be greater than zero'],
    ['-1', 'Amount must be a positive number'],
  ])('rejects invalid amount %j without saving it', async (amount, message) => {
    const { storage } = renderApp()
    const user = await completeSetup()

    if (amount) {
      await user.type(screen.getByLabelText('Amount'), amount)
    }
    await user.type(screen.getByLabelText('Date'), '2026-01-10')
    await user.selectOptions(screen.getByLabelText('Category'), 'Groceries')
    await user.click(screen.getByRole('button', { name: 'Add transaction' }))

    expect(screen.getByText(new RegExp(message))).toBeInTheDocument()
    const stored = JSON.parse(storage.values.get(STORAGE_KEY) ?? '{}')
    expect(stored.transactions).toEqual([])
  })

  it('identifies missing date and category without saving', async () => {
    const { storage } = renderApp()
    const user = await completeSetup()

    await user.type(screen.getByLabelText('Amount'), '25.50')
    await user.click(screen.getByRole('button', { name: 'Add transaction' }))

    expect(screen.getByText('Enter a valid calendar date')).toBeInTheDocument()
    expect(screen.getByText('Select a valid expense category')).toBeInTheDocument()
    expect(JSON.parse(storage.values.get(STORAGE_KEY) ?? '{}').transactions).toEqual([])
  })

  it('isolates transactions and summaries by the selected month', async () => {
    renderApp()
    const user = await completeSetup()

    await addExpense(user, {
      amount: '10',
      date: '2026-01-10',
      category: 'Utilities',
    })
    await addExpense(user, {
      amount: '20',
      date: '2026-02-10',
      category: 'Travel',
    })

    expect(screen.getByRole('list')).toHaveTextContent('Utilities')
    expect(screen.getByRole('list')).not.toHaveTextContent('Travel')
    expect(screen.getByLabelText('Total expenses')).toHaveTextContent('USD 10.00')

    await user.clear(screen.getByLabelText('Month'))
    await user.type(screen.getByLabelText('Month'), '2026-02')

    expect(screen.getByRole('list')).toHaveTextContent('Travel')
    expect(screen.getByRole('list')).not.toHaveTextContent('Utilities')
    expect(screen.getByLabelText('Total expenses')).toHaveTextContent('USD 20.00')
  })

  it('shows a zero summary and empty states for a month without transactions', async () => {
    renderApp()
    await completeSetup()

    expect(screen.getByText('No transactions this month.')).toBeInTheDocument()
    expect(screen.getByText('No expense categories this month.')).toBeInTheDocument()
    expect(screen.getByLabelText('Total income')).toHaveTextContent('USD 0.00')
    expect(screen.getByLabelText('Total expenses')).toHaveTextContent('USD 0.00')
    expect(screen.getByLabelText('Total balance')).toHaveTextContent('USD 0.00')
  })

  it('rejects an addition that would make a monthly total unsafe', async () => {
    const storage = new MemoryStorage()
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        currency: 'USD',
        transactions: [
          {
            id: 'existing',
            type: 'income',
            amountMinor: Number.MAX_SAFE_INTEGER,
            date: '2026-01-01',
          },
        ],
      }),
    )
    renderApp(storage)
    const user = userEvent.setup()

    await user.click(screen.getByLabelText('Income'))
    await user.type(screen.getByLabelText('Amount'), '.01')
    await user.type(screen.getByLabelText('Date'), '2026-01-02')
    await user.click(screen.getByRole('button', { name: 'Add transaction' }))

    expect(
      screen.getByText('This amount would make the monthly totals too large.'),
    ).toBeInTheDocument()
    const stored = JSON.parse(storage.values.get(STORAGE_KEY) ?? '{}')
    expect(stored.transactions).toHaveLength(1)
  })

  it('recovers from malformed saved data without rendering a blank screen', () => {
    const storage = new MemoryStorage()
    storage.values.set(STORAGE_KEY, '{invalid')

    renderApp(storage)

    expect(screen.getByRole('heading', { name: 'Welcome to Varto' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Unreadable saved data was cleared',
    )
    expect(storage.values.has(STORAGE_KEY)).toBe(false)
  })

  it('reports unavailable storage rather than claiming data can be saved', () => {
    const storage: StorageAdapter = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    }

    render(
      <App
        storage={storage}
        now={NOW}
        createTransactionId={() => 'unavailable-storage-id'}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Storage unavailable' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Varto cannot safely save your data',
    )
  })
})
