import { formatNumber } from '@angular/common';
import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Money } from '../api/api-types';

/** Formats money as "12,000.00 UAH"; a missing price is shown as "—". Never converts currencies. */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: { amount: number; currency: string } | null | undefined): string {
    if (!value) return '—';
    return `${formatNumber(value.amount, this.locale, '1.2-2')} ${value.currency}`;
  }
}

export type MoneyForm = FormGroup<{
  amount: FormControl<number | null>;
  currency: FormControl<string>;
}>;

/** An optional price: both fields empty means "no price" (null). */
export function moneyForm(value: Money | null | undefined, defaultCurrency = 'UAH'): MoneyForm {
  const form: MoneyForm = new FormGroup({
    amount: new FormControl<number | null>(value?.amount ?? null, [
      Validators.min(0),
      Validators.max(999999999.99),
    ]),
    // The currency only matters when an amount is entered.
    currency: new FormControl(value?.currency ?? defaultCurrency, {
      nonNullable: true,
      validators: [
        (control) =>
          isEmptyAmount(control.parent?.get('amount')?.value)
            ? null
            : Validators.pattern(/^[A-Za-z]{3}$/)(control),
      ],
    }),
  });
  // Re-validating also drops stale server errors on the currency.
  form.controls.amount.valueChanges.subscribe(() =>
    form.controls.currency.updateValueAndValidity(),
  );
  return form;
}

function isEmptyAmount(amount: unknown): boolean {
  return amount === null || amount === undefined || String(amount).trim() === '';
}

/** The contract value of a money form: null when no amount is entered. */
export function moneyValue(form: MoneyForm): Money | null {
  const { amount, currency } = form.getRawValue();
  if (amount === null || isEmptyAmount(amount)) return null;
  return { amount: Number(amount), currency: currency.trim().toUpperCase() };
}
