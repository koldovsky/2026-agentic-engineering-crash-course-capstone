import {
  isCurrency,
  isExpenseCategory,
  type Currency,
  type Transaction,
} from './domain/model'
import { isValidCalendarDate } from './domain/transactions'

export const STORAGE_KEY = 'varto:state'
export const SCHEMA_VERSION = 1 as const

export interface PersistedState {
  schemaVersion: typeof SCHEMA_VERSION
  currency: Currency
  transactions: Transaction[]
}

export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type LoadStateResult =
  | { status: 'empty' }
  | { status: 'loaded'; state: PersistedState }
  | { status: 'recovered' }
  | { status: 'unavailable'; error: Error }

export type SaveStateResult =
  | { ok: true }
  | { ok: false; error: Error }

export function loadState(storage: StorageAdapter): LoadStateResult {
  let serialized: string | null

  try {
    serialized = storage.getItem(STORAGE_KEY)
  } catch (error) {
    return { status: 'unavailable', error: toError(error) }
  }

  if (serialized === null) {
    return { status: 'empty' }
  }

  try {
    const value: unknown = JSON.parse(serialized)

    if (isPersistedState(value)) {
      return { status: 'loaded', state: value }
    }
  } catch {
    // Invalid JSON follows the same recovery path as an invalid schema.
  }

  try {
    storage.removeItem(STORAGE_KEY)
    return { status: 'recovered' }
  } catch (error) {
    return { status: 'unavailable', error: toError(error) }
  }
}

export function saveState(
  storage: StorageAdapter,
  state: PersistedState,
): SaveStateResult {
  if (!isPersistedState(state)) {
    return { ok: false, error: new Error('Refusing to persist invalid Varto state') }
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
    return { ok: true }
  } catch (error) {
    return { ok: false, error: toError(error) }
  }
}

export function isPersistedState(value: unknown): value is PersistedState {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['schemaVersion', 'currency', 'transactions'])
  ) {
    return false
  }

  if (
    value.schemaVersion !== SCHEMA_VERSION ||
    !isCurrency(value.currency) ||
    !Array.isArray(value.transactions)
  ) {
    return false
  }

  const ids = new Set<string>()

  for (const transaction of value.transactions) {
    if (!isTransaction(transaction) || ids.has(transaction.id)) {
      return false
    }

    ids.add(transaction.id)
  }

  return true
}

function isTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) {
    return false
  }

  if (
    typeof value.id !== 'string' ||
    value.id.trim() === '' ||
    !Number.isSafeInteger(value.amountMinor) ||
    (value.amountMinor as number) <= 0 ||
    !isValidCalendarDate(value.date)
  ) {
    return false
  }

  if (value.type === 'income') {
    return hasOnlyKeys(value, ['id', 'type', 'amountMinor', 'date'])
  }

  return (
    value.type === 'expense' &&
    isExpenseCategory(value.category) &&
    hasOnlyKeys(value, ['id', 'type', 'amountMinor', 'date', 'category'])
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key))
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
