import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Item } from '../api/api-types';
import { ItemsService } from '../api/items.service';
import { ApiError } from '../api/problem';
import { applyServerErrors, controlError, optionalText } from '../shared/form-errors';

/** Either a project to add an item to, or the item to edit. */
export type ItemFormData = { projectId: string; item?: undefined } | { item: Item };

@Component({
  selector: 'app-item-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.item ? 'Edit item' : 'Add item' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="dialog-form">
        <mat-form-field>
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" maxlength="200" required />
          <mat-error>{{ error('name') }}</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Quantity</mat-label>
          <input matInput type="number" formControlName="quantity" min="1" max="10000" step="1" />
          <mat-error>{{ error('quantity') }}</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
          <mat-error>{{ error('notes') }}</mat-error>
        </mat-form-field>
        @for (message of formErrors(); track message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit" [disabled]="saving()">
          {{ data.item ? 'Save' : 'Create' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class ItemFormDialog {
  protected readonly data = inject<ItemFormData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ItemFormDialog, Item>>(MatDialogRef);
  private readonly items = inject(ItemsService);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [this.data.item?.name ?? '', [Validators.required, Validators.maxLength(200)]],
    quantity: [
      this.data.item?.quantity ?? 1,
      [Validators.required, Validators.min(1), Validators.max(10000), Validators.pattern(/^\d+$/)],
    ],
    notes: [this.data.item?.notes ?? '', Validators.maxLength(2000)],
  });
  protected readonly saving = signal(false);
  protected readonly formErrors = signal<string[]>([]);

  protected error(name: string): string {
    return controlError(this.form.get(name));
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const input = {
      name: value.name.trim(),
      quantity: Number(value.quantity),
      notes: optionalText(value.notes),
    };
    const request = this.data.item
      ? this.items.update(this.data.item.id, input)
      : this.items.create(this.data.projectId, input);
    this.saving.set(true);
    request.subscribe({
      next: (item) => this.dialogRef.close(item),
      error: (error: ApiError) => {
        this.saving.set(false);
        this.formErrors.set(applyServerErrors(this.form, error));
      },
    });
  }
}
