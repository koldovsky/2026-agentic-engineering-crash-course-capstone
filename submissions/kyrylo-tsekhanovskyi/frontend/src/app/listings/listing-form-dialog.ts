import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Listing, ListingInput } from '../api/api-types';
import { ListingsService } from '../api/listings.service';
import { ApiError } from '../api/problem';
import { applyServerErrors, controlError, optionalText } from '../shared/form-errors';
import { moneyForm, moneyValue } from '../shared/money';

/** Platform suggestions; the field also accepts any other text (listings spec). */
export const PLATFORM_SUGGESTIONS = [
  'OLX',
  'eBay',
  'Allegro',
  'Amazon',
  'Rozetka',
  'Prom',
] as const;

/** Either a project to add a listing to, or the listing to edit. */
export type ListingFormData = { projectId: string; listing?: undefined } | { listing: Listing };

@Component({
  selector: 'app-listing-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.listing ? 'Edit listing' : 'Add listing' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="dialog-form">
        <mat-form-field>
          <mat-label>Title</mat-label>
          <input matInput formControlName="title" maxlength="200" required />
          <mat-error>{{ error('title') }}</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>URL</mat-label>
          <input matInput type="url" formControlName="url" maxlength="2048" required />
          <mat-error>{{ error('url') }}</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Platform</mat-label>
          <input
            matInput
            formControlName="platform"
            maxlength="50"
            required
            [matAutocomplete]="platforms"
          />
          <mat-autocomplete #platforms="matAutocomplete">
            @for (platform of platformOptions(); track platform) {
              <mat-option [value]="platform">{{ platform }}</mat-option>
            }
          </mat-autocomplete>
          <mat-error>{{ error('platform') }}</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Seller name</mat-label>
          <input matInput formControlName="sellerName" maxlength="200" />
          <mat-error>{{ error('sellerName') }}</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Seller contact</mat-label>
          <input matInput formControlName="sellerContact" maxlength="200" />
          <mat-error>{{ error('sellerContact') }}</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
          <mat-error>{{ error('notes') }}</mat-error>
        </mat-form-field>
        <div class="form-row" formGroupName="agreedTotal">
          <mat-form-field>
            <mat-label>Agreed total</mat-label>
            <input matInput type="number" formControlName="amount" min="0" step="0.01" />
            <mat-error>{{ error('agreedTotal.amount') }}</mat-error>
          </mat-form-field>
          <mat-form-field class="currency">
            <mat-label>Currency</mat-label>
            <input matInput formControlName="currency" maxlength="3" />
            <mat-error>{{ error('agreedTotal.currency') }}</mat-error>
          </mat-form-field>
        </div>
        @for (message of formErrors(); track message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit" [disabled]="saving()">
          {{ data.listing ? 'Save' : 'Create' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class ListingFormDialog {
  protected readonly data = inject<ListingFormData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ListingFormDialog, Listing>>(MatDialogRef);
  private readonly listings = inject(ListingsService);

  private readonly listing = this.data.listing;
  protected readonly form = new FormGroup({
    title: text(this.listing?.title, [Validators.required, Validators.maxLength(200)]),
    url: text(this.listing?.url, [
      Validators.required,
      Validators.maxLength(2048),
      Validators.pattern(/^https?:\/\/\S+$/i),
    ]),
    platform: text(this.listing?.platform, [Validators.required, Validators.maxLength(50)]),
    sellerName: text(this.listing?.sellerName, [Validators.maxLength(200)]),
    sellerContact: text(this.listing?.sellerContact, [Validators.maxLength(200)]),
    notes: text(this.listing?.notes, [Validators.maxLength(2000)]),
    agreedTotal: moneyForm(this.listing?.agreedTotal),
  });
  private readonly platformText = toSignal(this.form.controls.platform.valueChanges, {
    initialValue: this.form.controls.platform.value,
  });
  protected readonly platformOptions = computed(() => {
    const typed = this.platformText().trim().toLowerCase();
    return PLATFORM_SUGGESTIONS.filter((p) => p.toLowerCase().includes(typed));
  });
  protected readonly saving = signal(false);
  protected readonly formErrors = signal<string[]>([]);

  protected error(path: string): string {
    return controlError(this.form.get(path));
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const input: ListingInput = {
      title: value.title.trim(),
      url: value.url.trim(),
      platform: value.platform.trim(),
      sellerName: optionalText(value.sellerName),
      sellerContact: optionalText(value.sellerContact),
      notes: optionalText(value.notes),
      agreedTotal: moneyValue(this.form.controls.agreedTotal),
    };
    const request = this.data.listing
      ? this.listings.update(this.data.listing.id, input)
      : this.listings.create(this.data.projectId, input);
    this.saving.set(true);
    request.subscribe({
      next: (listing) => this.dialogRef.close(listing),
      error: (error: ApiError) => {
        this.saving.set(false);
        this.formErrors.set(applyServerErrors(this.form, error));
      },
    });
  }
}

function text(value: string | null | undefined, validators: ValidatorFn[]): FormControl<string> {
  return new FormControl(value ?? '', { nonNullable: true, validators });
}
