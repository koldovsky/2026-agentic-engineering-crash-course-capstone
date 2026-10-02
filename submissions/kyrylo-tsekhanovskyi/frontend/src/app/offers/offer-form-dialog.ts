import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Listing, Offer } from '../api/api-types';
import { ListingsService } from '../api/listings.service';
import { OffersService } from '../api/offers.service';
import { ApiError, errorMessage } from '../api/problem';
import { applyServerErrors, controlError } from '../shared/form-errors';
import { moneyForm, moneyValue } from '../shared/money';

/** Create: link the item to a listing of its project. Edit: change the unit prices of an offer. */
export type OfferFormData =
  { itemId: string; projectId: string; offer?: undefined } | { offer: Offer };

@Component({
  selector: 'app-offer-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.offer ? 'Edit prices' : 'Add offer' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="dialog-form">
        @if (data.offer; as offer) {
          <p class="dialog-context">{{ offer.listingTitle }} · {{ offer.listingPlatform }}</p>
        } @else {
          <mat-form-field>
            <mat-label>Listing</mat-label>
            <select matNativeControl formControlName="listingId" required>
              <option value="" disabled></option>
              @for (listing of listings(); track listing.id) {
                <option [value]="listing.id">{{ listing.title }}</option>
              }
            </select>
            <mat-hint>A listing of this project</mat-hint>
            <mat-error>{{ error('listingId') }}</mat-error>
          </mat-form-field>
        }
        <div class="form-row" formGroupName="askingPrice">
          <mat-form-field>
            <mat-label>Asking unit price</mat-label>
            <input matInput type="number" formControlName="amount" min="0" step="0.01" />
            <mat-error>{{ error('askingPrice.amount') }}</mat-error>
          </mat-form-field>
          <mat-form-field class="currency">
            <mat-label>Currency</mat-label>
            <input matInput formControlName="currency" maxlength="3" />
            <mat-error>{{ error('askingPrice.currency') }}</mat-error>
          </mat-form-field>
        </div>
        <div class="form-row" formGroupName="agreedPrice">
          <mat-form-field>
            <mat-label>Agreed unit price</mat-label>
            <input matInput type="number" formControlName="amount" min="0" step="0.01" />
            <mat-error>{{ error('agreedPrice.amount') }}</mat-error>
          </mat-form-field>
          <mat-form-field class="currency">
            <mat-label>Currency</mat-label>
            <input matInput formControlName="currency" maxlength="3" />
            <mat-error>{{ error('agreedPrice.currency') }}</mat-error>
          </mat-form-field>
        </div>
        @for (message of formErrors(); track message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit" [disabled]="saving()">
          {{ data.offer ? 'Save' : 'Create' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class OfferFormDialog implements OnInit {
  protected readonly data = inject<OfferFormData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<OfferFormDialog, Offer>>(MatDialogRef);
  private readonly offers = inject(OffersService);
  private readonly listingsApi = inject(ListingsService);

  protected readonly form = new FormGroup({
    listingId: new FormControl('', {
      nonNullable: true,
      validators: this.data.offer ? [] : [Validators.required],
    }),
    askingPrice: moneyForm(this.data.offer?.askingPrice),
    agreedPrice: moneyForm(this.data.offer?.agreedPrice),
  });
  protected readonly listings = signal<Listing[]>([]);
  protected readonly saving = signal(false);
  protected readonly formErrors = signal<string[]>([]);

  ngOnInit(): void {
    if (this.data.offer) return;
    this.listingsApi.listByProject(this.data.projectId).subscribe({
      next: (listings) => this.listings.set(listings),
      error: (error: unknown) => this.formErrors.set([errorMessage(error)]),
    });
  }

  protected error(path: string): string {
    return controlError(this.form.get(path));
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const askingPrice = moneyValue(this.form.controls.askingPrice);
    const agreedPrice = moneyValue(this.form.controls.agreedPrice);
    const request = this.data.offer
      ? this.offers.update(this.data.offer.id, { askingPrice, agreedPrice })
      : this.offers.create(this.data.itemId, {
          listingId: this.form.controls.listingId.value,
          askingPrice,
          agreedPrice,
        });
    this.saving.set(true);
    request.subscribe({
      next: (offer) => this.dialogRef.close(offer),
      error: (error: ApiError) => {
        this.saving.set(false);
        this.formErrors.set(applyServerErrors(this.form, error));
      },
    });
  }
}
