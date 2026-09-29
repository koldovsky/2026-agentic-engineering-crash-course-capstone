import { describe, expect, it } from 'vitest'

import type { PersistedState, StorageAdapter } from './storage'
import {
  isPersistedState,
  loadState,
  saveState,
  SCHEMA_VERSION,
  STORAGE_KEY,
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

const state: PersistedState = {
  schemaVersion: SCHEMA_VERSION,
  currency: 'UAH',
  transactions: [
    {
      id: 'income-1',
      type: 'income',
      amountMinor: 100_000,
      date: '2026-01-05',
    },
    {
      id: 'expense-1',
      type: 'expense',
      amountMinor: 2_550,
      date: '2026-01-06',
      category: 'Groceries',
    },
  ],
}

describe('Varto storage', () => {
  it('treats missing storage as first use', () => {
    expect(loadState(new MemoryStorage())).toEqual({ status: 'empty' })
  })

  it('round-trips valid versioned state without changing it', () => {
    const storage = new MemoryStorage()

    expect(saveState(storage, state)).toEqual({ ok: true })
    expect(loadState(storage)).toEqual({ status: 'loaded', state })
  })

  it.each([
    ['malformed JSON', '{not-json'],
    [
      'unsupported schema',
      JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION + 1 }),
    ],
    ['invalid currency', JSON.stringify({ ...state, currency: 'GBP' })],
    [
      'unknown root data',
      JSON.stringify({ ...state, accountName: 'Personal' }),
    ],
    [
      'invalid transaction date',
      JSON.stringify({
        ...state,
        transactions: [{ ...state.transactions[0], date: '2026-02-30' }],
      }),
    ],
    [
      'invalid expense category',
      JSON.stringify({
        ...state,
        transactions: [
          { ...state.transactions[1], category: 'Automotive' },
        ],
      }),
    ],
    [
      'income with a category',
      JSON.stringify({
        ...state,
        transactions: [{ ...state.transactions[0], category: 'Other' }],
      }),
    ],
    [
      'duplicate IDs',
      JSON.stringify({
        ...state,
        transactions: [state.transactions[0], state.transactions[0]],
      }),
    ],
    [
      'out-of-scope transaction metadata',
      JSON.stringify({
        ...state,
        transactions: [{ ...state.transactions[0], description: 'Salary' }],
      }),
    ],
  ])('discards %s and returns a recoverable empty state', (_label, serialized) => {
    const storage = new MemoryStorage()
    storage.values.set(STORAGE_KEY, serialized)

    expect(loadState(storage)).toEqual({ status: 'recovered' })
    expect(storage.values.has(STORAGE_KEY)).toBe(false)
  })

  it('reports a read failure rather than claiming empty state', () => {
    const error = new Error('Storage is blocked')
    const storage: StorageAdapter = {
      getItem: () => {
        throw error
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    }

    expect(loadState(storage)).toEqual({ status: 'unavailable', error })
  })

  it('reports a failed cleanup rather than repeatedly claiming recovery', () => {
    const error = new Error('Storage cleanup is blocked')
    const storage: StorageAdapter = {
      getItem: () => 'invalid',
      setItem: () => undefined,
      removeItem: () => {
        throw error
      },
    }

    expect(loadState(storage)).toEqual({ status: 'unavailable', error })
  })

  it('reports a write failure rather than claiming persistence', () => {
    const error = new Error('Storage quota exceeded')
    const storage: StorageAdapter = {
      getItem: () => null,
      setItem: () => {
        throw error
      },
      removeItem: () => undefined,
    }

    expect(saveState(storage, state)).toEqual({ ok: false, error })
  })

  it('refuses to persist invalid runtime state', () => {
    const storage = new MemoryStorage()
    const invalidState = {
      ...state,
      transactions: [{ ...state.transactions[0], amountMinor: 0 }],
    }

    expect(isPersistedState(invalidState)).toBe(false)
    expect(saveState(storage, invalidState as PersistedState).ok).toBe(false)
    expect(storage.values.has(STORAGE_KEY)).toBe(false)
  })
})
