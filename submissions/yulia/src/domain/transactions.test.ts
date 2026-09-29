import { describe, expect, it } from 'vitest'

import type { Transaction, TransactionInput } from './model'
import {
  addTransaction,
  filterTransactionsByMonth,
  isValidCalendarDate,
  isValidMonth,
  parseAmountToMinorUnits,
  removeTransaction,
  replaceTransaction,
  summarizeMonth,
  UnsafeAggregateError,
  validateTransactionInput,
} from './transactions'

const transactions: Transaction[] = [
  {
    id: 'income-january',
    type: 'income',
    amountMinor: 100_000,
    date: '2026-01-05',
  },
  {
    id: 'utilities-one',
    type: 'expense',
    amountMinor: 10_000,
    date: '2026-01-10',
    category: 'Utilities',
  },
  {
    id: 'transportation',
    type: 'expense',
    amountMinor: 4_000,
    date: '2026-01-20',
    category: 'Transportation',
  },
  {
    id: 'utilities-two',
    type: 'expense',
    amountMinor: 6_000,
    date: '2026-01-31',
    category: 'Utilities',
  },
  {
    id: 'february',
    type: 'expense',
    amountMinor: 2_500,
    date: '2026-02-01',
    category: 'Groceries',
  },
]

function validInput(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    id: 'transaction-1',
    type: 'expense',
    amount: '25.50',
    date: '2026-01-15',
    category: 'Groceries',
    ...overrides,
  }
}

describe('parseAmountToMinorUnits', () => {
  it.each([
    ['25.50', 2_550],
    ['1000', 100_000],
    ['0.1', 10],
    ['.50', 50],
    ['1.', 100],
    [' 12.34 ', 1_234],
  ])('parses %s without floating-point arithmetic', (input, expected) => {
    expect(parseAmountToMinorUnits(input)).toEqual({ ok: true, value: expected })
  })

  it.each(['', 'not-a-number', '0', '0.00', '-1', '1.001', '1,00']) (
    'rejects invalid amount %j',
    (input) => {
      expect(parseAmountToMinorUnits(input).ok).toBe(false)
    },
  )

  it('rejects values outside safe integer precision', () => {
    expect(parseAmountToMinorUnits('90071992547410').ok).toBe(false)
  })
})

describe('calendar validation', () => {
  it.each(['2024-02-29', '2026-01-31', '0001-01-01'])(
    'accepts valid date %s',
    (date) => expect(isValidCalendarDate(date)).toBe(true),
  )

  it.each(['', '2023-02-29', '2026-04-31', '2026-13-01', '2026-1-01', '0000-01-01'])(
    'rejects invalid date %s',
    (date) => expect(isValidCalendarDate(date)).toBe(false),
  )

  it.each(['2026-01', '0001-12'])(
    'accepts valid month %s',
    (month) => expect(isValidMonth(month)).toBe(true),
  )

  it.each(['2026-00', '2026-13', '2026-1', '0000-01'])(
    'rejects invalid month %s',
    (month) => expect(isValidMonth(month)).toBe(false),
  )
})

describe('validateTransactionInput', () => {
  it('creates a valid expense with integer minor units', () => {
    expect(validateTransactionInput(validInput())).toEqual({
      ok: true,
      value: {
        id: 'transaction-1',
        type: 'expense',
        amountMinor: 2_550,
        date: '2026-01-15',
        category: 'Groceries',
      },
    })
  })

  it('normalizes income by omitting an existing expense category', () => {
    expect(
      validateTransactionInput(
        validInput({ type: 'income', amount: '1000', category: 'Car' }),
      ),
    ).toEqual({
      ok: true,
      value: {
        id: 'transaction-1',
        type: 'income',
        amountMinor: 100_000,
        date: '2026-01-15',
      },
    })
  })

  it.each([
    [{ id: '' }, 'id'],
    [{ type: 'transfer' }, 'type'],
    [{ amount: '' }, 'amount'],
    [{ amount: 'word' }, 'amount'],
    [{ amount: '0' }, 'amount'],
    [{ amount: '-2' }, 'amount'],
    [{ date: '' }, 'date'],
    [{ date: '2026-02-30' }, 'date'],
    [{ category: undefined }, 'category'],
    [{ category: 'Fuel' }, 'category'],
  ] satisfies Array<[Partial<TransactionInput>, string]>) (
    'identifies invalid input %j on %s',
    (overrides, field) => {
      const result = validateTransactionInput(validInput(overrides))

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors).toHaveProperty(field)
      }
    },
  )
})

describe('monthly calculations', () => {
  it('filters by the calendar date string without timezone conversion', () => {
    expect(filterTransactionsByMonth(transactions, '2026-01')).toHaveLength(4)
    expect(filterTransactionsByMonth(transactions, '2026-02')).toEqual([
      transactions[4],
    ])
    expect(filterTransactionsByMonth(transactions, 'invalid')).toEqual([])
  })

  it('matches the approved monthly summary example', () => {
    expect(summarizeMonth(transactions, '2026-01')).toEqual({
      incomeMinor: 100_000,
      expensesMinor: 20_000,
      balanceMinor: 80_000,
      spendingByCategory: {
        Utilities: 16_000,
        Transportation: 4_000,
      },
    })
  })

  it('returns a zero summary without fabricated categories for an empty month', () => {
    expect(summarizeMonth(transactions, '2026-03')).toEqual({
      incomeMinor: 0,
      expensesMinor: 0,
      balanceMinor: 0,
      spendingByCategory: {},
    })
  })

  it('recalculates both affected months after replacing a transaction date', () => {
    const moved: Transaction = {
      ...transactions[4],
      date: '2026-01-31',
    }
    const result = replaceTransaction(transactions, moved)

    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw result.error
    }

    expect(summarizeMonth(result.value, '2026-01').expensesMinor).toBe(22_500)
    expect(summarizeMonth(result.value, '2026-02').expensesMinor).toBe(0)
    expect(transactions[4].date).toBe('2026-02-01')
  })

  it('fails explicitly instead of returning an unsafe aggregate', () => {
    const unsafe: Transaction[] = [
      {
        id: 'income-limit',
        type: 'income',
        amountMinor: Number.MAX_SAFE_INTEGER,
        date: '2026-01-01',
      },
      {
        id: 'income-overflow',
        type: 'income',
        amountMinor: 1,
        date: '2026-01-02',
      },
    ]

    expect(() => summarizeMonth(unsafe, '2026-01')).toThrow(
      UnsafeAggregateError,
    )
  })

  it('rejects an addition that would make a monthly aggregate unsafe', () => {
    const previous: Transaction[] = [
      {
        id: 'income-limit',
        type: 'income',
        amountMinor: Number.MAX_SAFE_INTEGER,
        date: '2026-01-01',
      },
    ]
    const addition: Transaction = {
      id: 'income-overflow',
      type: 'income',
      amountMinor: 1,
      date: '2026-01-02',
    }

    const result = addTransaction(previous, addition)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(UnsafeAggregateError)
    }
    expect(previous).toHaveLength(1)
  })

  it('rejects an edit that would make a monthly aggregate unsafe', () => {
    const previous: Transaction[] = [
      {
        id: 'income-one',
        type: 'income',
        amountMinor: Number.MAX_SAFE_INTEGER - 1,
        date: '2026-01-01',
      },
      {
        id: 'income-two',
        type: 'income',
        amountMinor: 1,
        date: '2026-01-02',
      },
    ]
    const replacement: Transaction = {
      ...previous[1],
      amountMinor: 2,
    }

    const result = replaceTransaction(previous, replacement)

    expect(result.ok).toBe(false)
    expect(previous[1].amountMinor).toBe(1)
  })

  it('allows safe aggregates in different calendar months', () => {
    const previous: Transaction[] = [
      {
        id: 'january-limit',
        type: 'income',
        amountMinor: Number.MAX_SAFE_INTEGER,
        date: '2026-01-01',
      },
    ]
    const addition: Transaction = {
      id: 'february-limit',
      type: 'income',
      amountMinor: Number.MAX_SAFE_INTEGER,
      date: '2026-02-01',
    }

    expect(addTransaction(previous, addition).ok).toBe(true)
  })

  it('removes a transaction immutably', () => {
    const updated = removeTransaction(transactions, 'utilities-one')

    expect(updated).toHaveLength(4)
    expect(updated.some(({ id }) => id === 'utilities-one')).toBe(false)
    expect(transactions).toHaveLength(5)
  })
})
