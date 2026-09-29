import {
  isExpenseCategory,
  type ExpenseCategory,
  type MonthlySummary,
  type Transaction,
  type TransactionInput,
} from './model'

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: TransactionValidationErrors }

export interface TransactionValidationErrors {
  id?: string
  type?: string
  amount?: string
  date?: string
  category?: string
}

export class UnsafeAggregateError extends RangeError {
  constructor(aggregate: string) {
    super(`${aggregate} exceeds the safe integer range`)
    this.name = 'UnsafeAggregateError'
  }
}

export type TransactionChangeResult =
  | { ok: true; value: Transaction[] }
  | { ok: false; error: UnsafeAggregateError }

type AmountResult =
  | { ok: true; value: number }
  | { ok: false; message: string }

const AMOUNT_PATTERN = /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/

export function parseAmountToMinorUnits(value: string): AmountResult {
  const normalized = value.trim()

  if (normalized === '') {
    return { ok: false, message: 'Amount is required' }
  }

  if (!AMOUNT_PATTERN.test(normalized)) {
    return {
      ok: false,
      message: 'Amount must be a positive number with up to two decimal places',
    }
  }

  const [majorPart = '0', fractionPart = ''] = normalized.split('.')
  const major = Number(majorPart || '0')
  const fraction = fractionPart.padEnd(2, '0')
  const amountMinor = major * 100 + Number(fraction)

  if (amountMinor <= 0) {
    return { ok: false, message: 'Amount must be greater than zero' }
  }

  if (!Number.isSafeInteger(amountMinor)) {
    return { ok: false, message: 'Amount is too large' }
  }

  return { ok: true, value: amountMinor }
}

export function isValidCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false
  }

  const match = DATE_PATTERN.exec(value)

  if (!match) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (year === 0 || month < 1 || month > 12 || day < 1) {
    return false
  }

  return day <= daysInMonth(year, month)
}

export function isValidMonth(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false
  }

  const match = MONTH_PATTERN.exec(value)

  if (!match) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])

  return year > 0 && month >= 1 && month <= 12
}

export function validateTransactionInput(
  input: TransactionInput,
): ValidationResult<Transaction> {
  const errors: TransactionValidationErrors = {}
  const id = input.id.trim()

  if (id === '') {
    errors.id = 'Transaction ID is required'
  }

  if (input.type !== 'income' && input.type !== 'expense') {
    errors.type = 'Transaction type must be income or expense'
  }

  const amountResult = parseAmountToMinorUnits(input.amount)

  if (!amountResult.ok) {
    errors.amount = amountResult.message
  }

  if (!isValidCalendarDate(input.date)) {
    errors.date = 'Enter a valid calendar date'
  }

  if (input.type === 'expense' && !isExpenseCategory(input.category)) {
    errors.category = 'Select a valid expense category'
  }

  if (Object.keys(errors).length > 0 || !amountResult.ok) {
    return { ok: false, errors }
  }

  const base = {
    id,
    amountMinor: amountResult.value,
    date: input.date,
  }

  if (input.type === 'income') {
    return { ok: true, value: { ...base, type: 'income' } }
  }

  return {
    ok: true,
    value: {
      ...base,
      type: 'expense',
      category: input.category as ExpenseCategory,
    },
  }
}

export function filterTransactionsByMonth(
  transactions: readonly Transaction[],
  month: string,
): Transaction[] {
  if (!isValidMonth(month)) {
    return []
  }

  return transactions.filter((transaction) => transaction.date.slice(0, 7) === month)
}

export function summarizeTransactions(
  transactions: readonly Transaction[],
): MonthlySummary {
  let incomeMinor = 0
  let expensesMinor = 0
  const spendingByCategory: Partial<Record<ExpenseCategory, number>> = {}

  for (const transaction of transactions) {
    if (transaction.type === 'income') {
      incomeMinor = addSafe(
        incomeMinor,
        transaction.amountMinor,
        'Monthly income',
      )
      continue
    }

    expensesMinor = addSafe(
      expensesMinor,
      transaction.amountMinor,
      'Monthly expenses',
    )
    spendingByCategory[transaction.category] = addSafe(
      spendingByCategory[transaction.category] ?? 0,
      transaction.amountMinor,
      `${transaction.category} spending`,
    )
  }

  return {
    incomeMinor,
    expensesMinor,
    balanceMinor: subtractSafe(incomeMinor, expensesMinor, 'Monthly balance'),
    spendingByCategory,
  }
}

export function summarizeMonth(
  transactions: readonly Transaction[],
  month: string,
): MonthlySummary {
  return summarizeTransactions(filterTransactionsByMonth(transactions, month))
}

export function addTransaction(
  transactions: readonly Transaction[],
  transaction: Transaction,
): TransactionChangeResult {
  return acceptIfAggregatesAreSafe([...transactions, transaction])
}

export function replaceTransaction(
  transactions: readonly Transaction[],
  replacement: Transaction,
): TransactionChangeResult {
  const candidate = transactions.map((transaction) =>
    transaction.id === replacement.id ? replacement : transaction,
  )

  return acceptIfAggregatesAreSafe(candidate)
}

export function removeTransaction(
  transactions: readonly Transaction[],
  id: string,
): Transaction[] {
  return transactions.filter((transaction) => transaction.id !== id)
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function acceptIfAggregatesAreSafe(
  candidate: Transaction[],
): TransactionChangeResult {
  try {
    assertSafeMonthlyAggregates(candidate)
    return { ok: true, value: candidate }
  } catch (error) {
    if (error instanceof UnsafeAggregateError) {
      return { ok: false, error }
    }

    throw error
  }
}

export function assertSafeMonthlyAggregates(
  transactions: readonly Transaction[],
): void {
  const months = new Set(
    transactions.map((transaction) => transaction.date.slice(0, 7)),
  )

  for (const month of months) {
    summarizeMonth(transactions, month)
  }
}

function addSafe(left: number, right: number, aggregate: string): number {
  const result = left + right

  if (
    !Number.isSafeInteger(left) ||
    !Number.isSafeInteger(right) ||
    !Number.isSafeInteger(result)
  ) {
    throw new UnsafeAggregateError(aggregate)
  }

  return result
}

function subtractSafe(left: number, right: number, aggregate: string): number {
  const result = left - right

  if (
    !Number.isSafeInteger(left) ||
    !Number.isSafeInteger(right) ||
    !Number.isSafeInteger(result)
  ) {
    throw new UnsafeAggregateError(aggregate)
  }

  return result
}
