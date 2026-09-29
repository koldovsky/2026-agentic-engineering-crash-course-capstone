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
      incomeMinor += transaction.amountMinor
      continue
    }

    expensesMinor += transaction.amountMinor
    spendingByCategory[transaction.category] =
      (spendingByCategory[transaction.category] ?? 0) + transaction.amountMinor
  }

  return {
    incomeMinor,
    expensesMinor,
    balanceMinor: incomeMinor - expensesMinor,
    spendingByCategory,
  }
}

export function summarizeMonth(
  transactions: readonly Transaction[],
  month: string,
): MonthlySummary {
  return summarizeTransactions(filterTransactionsByMonth(transactions, month))
}

export function replaceTransaction(
  transactions: readonly Transaction[],
  replacement: Transaction,
): Transaction[] {
  return transactions.map((transaction) =>
    transaction.id === replacement.id ? replacement : transaction,
  )
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
