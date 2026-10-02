import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Project } from '../api/api-types';
import { ApiError } from '../api/problem';
import { ProjectsService } from '../api/projects.service';
import { applyServerErrors, controlError, optionalText } from '../shared/form-errors';

export interface ProjectFormData {
  project?: Project;
}

/** "New project" / "Edit project" dialog; saves through the API and closes with the saved project. */
@Component({
  selector: 'app-project-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.project ? 'Edit project' : 'New project' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="dialog-form">
        <mat-form-field>
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" maxlength="200" required />
          <mat-error>{{ error('name') }}</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
          <mat-error>{{ error('description') }}</mat-error>
        </mat-form-field>
        @for (message of formErrors(); track message) {
          <p class="form-error" role="alert">{{ message }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit" [disabled]="saving()">
          {{ data.project ? 'Save' : 'Create' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class ProjectFormDialog {
  protected readonly data = inject<ProjectFormData | null>(MAT_DIALOG_DATA) ?? {};
  private readonly dialogRef = inject<MatDialogRef<ProjectFormDialog, Project>>(MatDialogRef);
  private readonly projects = inject(ProjectsService);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [this.data.project?.name ?? '', [Validators.required, Validators.maxLength(200)]],
    description: [this.data.project?.description ?? '', Validators.maxLength(2000)],
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
    const input = { name: value.name.trim(), description: optionalText(value.description) };
    const request = this.data.project
      ? this.projects.update(this.data.project.id, input)
      : this.projects.create(input);
    this.saving.set(true);
    request.subscribe({
      next: (project) => this.dialogRef.close(project),
      error: (error: ApiError) => {
        this.saving.set(false);
        this.formErrors.set(applyServerErrors(this.form, error));
      },
    });
  }
}
