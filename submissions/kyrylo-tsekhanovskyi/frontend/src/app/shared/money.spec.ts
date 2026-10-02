import { FormGroup } from '@angular/forms';
import { moneyForm, moneyValue } from './money';

describe('moneyForm', () => {
  it('review: clearing the amount of an optional price makes the form valid with a partial currency', () => {
    const form = new FormGroup({ price: moneyForm({ amount: 10, currency: 'UAH' }) });
    const price = form.controls.price;

    price.controls.currency.setValue('U');
    expect(form.valid).toBe(false);
    price.controls.amount.setValue(null);

    expect(form.valid).toBe(true);
    expect(moneyValue(price)).toBeNull();
  });

  it('review: clearing the amount drops stale server errors on the price', () => {
    const form = new FormGroup({ price: moneyForm({ amount: 10, currency: 'ZZZ' }) });
    const price = form.controls.price;
    price.controls.amount.setErrors({ server: 'Too many decimals.' });
    price.controls.currency.setErrors({ server: 'Unknown currency.' });

    price.controls.amount.setValue(null);

    expect(form.valid).toBe(true);
  });
});
