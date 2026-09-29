import type { Currency } from './model'

export function formatMoney(amountMinor: number, currency: Currency): string {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError('Cannot format an unsafe monetary amount')
  }

  const isNegative = amountMinor < 0
  const absoluteMinor = BigInt(Math.abs(amountMinor))
  const major = absoluteMinor / 100n
  const fraction = (absoluteMinor % 100n).toString().padStart(2, '0')
  const sign = isNegative ? '−' : ''

  return `${sign}${currency} ${major.toLocaleString('en-US')}.${fraction}`
}
