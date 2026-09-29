import { useState, type FormEvent } from 'react'

import { CURRENCIES, type Currency } from '../domain/model'

interface CurrencySetupProps {
  notice: string | null
  error: string | null
  onSelect: (currency: Currency) => void
}
export function CurrencySetup({ notice, error, onSelect }: CurrencySetupProps) {
  const [currency, setCurrency] = useState<Currency>('UAH')

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    onSelect(currency)
  }

  return (
    <section className="panel setup-panel" aria-labelledby="setup-title">
      <p className="eyebrow">Private by design</p>
      <h1 id="setup-title">Welcome to Varto</h1>
      <p>
        Choose one currency for your local finance tracker. This choice cannot be
        changed in the MVP.
      </p>

      {notice ? (
        <p className="notice" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit}>
        <label htmlFor="currency">Currency</label>
        <select
          id="currency"
          value={currency}
          onChange={(event) => setCurrency(event.target.value as Currency)}
        >
          {CURRENCIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button type="submit">Start tracking</button>
      </form>
    </section>
  )
}
