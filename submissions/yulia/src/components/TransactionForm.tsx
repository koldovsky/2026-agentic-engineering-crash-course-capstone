import { useState, type FormEvent, type ReactNode } from 'react'

import {
  EXPENSE_CATEGORIES,
  type TransactionType,
} from '../domain/model'
import type { TransactionValidationErrors } from '../domain/transactions'

export interface NewTransactionInput {
  type: TransactionType
  amount: string
  date: string
  category?: string
}
export type SubmissionResult =
  | { ok: true }
  | {
      ok: false
      errors?: TransactionValidationErrors
      formError?: string
    }

interface TransactionFormProps {
  onSubmit: (input: NewTransactionInput) => SubmissionResult
}

export function TransactionForm({ onSubmit }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [category, setCategory] = useState('')
  const [errors, setErrors] = useState<TransactionValidationErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const result = onSubmit({
      type,
      amount,
      date,
      category: type === 'expense' ? category : undefined,
    })

    if (!result.ok) {
      setErrors(result.errors ?? {})
      setFormError(result.formError ?? null)
      return
    }

    setErrors({})
    setFormError(null)
    setAmount('')
    setDate('')
    setCategory('')
  }

  function handleTypeChange(nextType: TransactionType): void {
    setType(nextType)
    setErrors((current) => ({ ...current, type: undefined, category: undefined }))
  }

  return (
    <section className="panel" aria-labelledby="transaction-form-heading">
      <p className="eyebrow">Manual entry</p>
      <h2 id="transaction-form-heading">Add transaction</h2>

      <form className="transaction-form" onSubmit={handleSubmit} noValidate>
        <fieldset>
          <legend>Transaction type</legend>
          <div className="segmented-control">
            <label>
              <input
                type="radio"
                name="transaction-type"
                value="expense"
                checked={type === 'expense'}
                onChange={() => handleTypeChange('expense')}
              />
              Expense
            </label>
            <label>
              <input
                type="radio"
                name="transaction-type"
                value="income"
                checked={type === 'income'}
                onChange={() => handleTypeChange('income')}
              />
              Income
            </label>
          </div>
        </fieldset>

        <FormField label="Amount" error={errors.amount} inputId="amount">
          <input
            id="amount"
            name="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? 'amount-error' : undefined}
            onChange={(event) => setAmount(event.target.value)}
          />
        </FormField>

        <FormField label="Date" error={errors.date} inputId="date">
          <input
            id="date"
            name="date"
            type="date"
            value={date}
            aria-invalid={Boolean(errors.date)}
            aria-describedby={errors.date ? 'date-error' : undefined}
            onChange={(event) => setDate(event.target.value)}
          />
        </FormField>

        {type === 'expense' ? (
          <FormField label="Category" error={errors.category} inputId="category">
            <select
              id="category"
              name="category"
              value={category}
              aria-invalid={Boolean(errors.category)}
              aria-describedby={errors.category ? 'category-error' : undefined}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">Select a category</option>
              {EXPENSE_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}

        {formError ? (
          <p className="field-error" role="alert">
            {formError}
          </p>
        ) : null}

        <button type="submit">Add transaction</button>
      </form>
    </section>
  )
}

interface FormFieldProps {
  label: string
  error?: string
  inputId: string
  children: ReactNode
}

function FormField({ label, error, inputId, children }: FormFieldProps) {
  return (
    <div className="form-field">
      <label htmlFor={inputId}>{label}</label>
      {children}
      {error ? (
        <p id={`${inputId}-error`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
