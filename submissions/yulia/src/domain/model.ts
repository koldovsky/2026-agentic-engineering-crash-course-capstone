export const CURRENCIES = ['UAH', 'USD', 'EUR'] as const

export type Currency = (typeof CURRENCIES)[number]

export const EXPENSE_CATEGORIES = [
  'Car',
  'Health',
  'Cafes & Restaurants',
  'Utilities',
  'Gifts',
  'Travel',
  'Entertainment',
  'Transportation',
  'Groceries',
  'Other',
  'Pets',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]
export type TransactionType = 'income' | 'expense'

interface BaseTransaction {
  id: string
  amountMinor: number
  date: string
}

export interface IncomeTransaction extends BaseTransaction {
  type: 'income'
}

export interface ExpenseTransaction extends BaseTransaction {
  type: 'expense'
  category: ExpenseCategory
}

export type Transaction = IncomeTransaction | ExpenseTransaction

export interface TransactionInput {
  id: string
  type: string
  amount: string
  date: string
  category?: string
}

export interface MonthlySummary {
  incomeMinor: number
  expensesMinor: number
  balanceMinor: number
  spendingByCategory: Partial<Record<ExpenseCategory, number>>
}

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && CURRENCIES.includes(value as Currency)
}

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return (
    typeof value === 'string' &&
    EXPENSE_CATEGORIES.includes(value as ExpenseCategory)
  )
}

