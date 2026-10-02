import { AbstractControl } from '@angular/forms';
import { ApiError } from '../api/problem';

/**
 * Shows server 400 field errors on the matching form controls (design D6). Keys are JSON property paths
 * such as "name" or "askingPrice.amount". Returns the messages that have no matching control.
 */
export function applyServerErrors(form: AbstractControl, error: ApiError): string[] {
  if (error.kind !== 'validation') return [error.message];
  const unmatched: string[] = [];
  for (const [path, messages] of Object.entries(error.fieldErrors)) {
    const control = form.get(path) ?? form.get(camelCase(path));
    if (control) {
      control.setErrors({ server: messages.join(' ') });
      control.markAsTouched();
    } else {
      unmatched.push(...messages);
    }
  }
  return unmatched.length > 0 || Object.keys(error.fieldErrors).length > 0
    ? unmatched
    : [error.message];
}

/** The text of the first error of a control, for mat-error. */
export function controlError(control: AbstractControl | null): string {
  const errors = control?.errors;
  if (!errors) return '';
  if (typeof errors['server'] === 'string') return errors['server'];
  if (errors['required']) return 'Required.';
  if (errors['maxlength']) return `At most ${errors['maxlength'].requiredLength} characters.`;
  if (errors['min']) return `At least ${errors['min'].min}.`;
  if (errors['max']) return `At most ${errors['max'].max}.`;
  if (errors['pattern']) return 'Invalid format.';
  return 'Invalid value.';
}

function camelCase(path: string): string {
  return path
    .split('.')
    .map((part) => part.charAt(0).toLowerCase() + part.slice(1))
    .join('.');
}

/** Trims a text value and turns an empty one into null, for optional contract fields. */
export function optionalText(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}
