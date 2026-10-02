import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { ProjectListEntry } from '../../api/api-types';
import { errorMessage } from '../../api/problem';
import { ProjectsService } from '../../api/projects.service';
import { confirm } from '../../shared/confirm-dialog';
import { formDialogConfig } from '../../shared/form-dialog';
import { PluralPipe } from '../../shared/display';
import { ProjectFormDialog, ProjectFormData } from '../project-form-dialog';

@Component({
  selector: 'app-project-list-page',
  imports: [DatePipe, PluralPipe, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './project-list-page.html',
  styleUrl: './project-list-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectListPage implements OnInit {
  private readonly projectsApi = inject(ProjectsService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly projects = signal<ProjectListEntry[] | null>(null);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  protected newProject(): void {
    this.dialog
      .open<ProjectFormDialog, ProjectFormData>(ProjectFormDialog, formDialogConfig({}))
      .afterClosed()
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }

  protected deleteProject(project: ProjectListEntry): void {
    confirm(this.dialog, {
      title: 'Delete project',
      message: `Delete the project "${project.name}" with all its items, listings and offers?`,
      confirmLabel: 'Delete',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.projectsApi.delete(project.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.load(),
        error: (error: unknown) => this.error.set(errorMessage(error)),
      });
  }

  private load(): void {
    this.projectsApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (projects) => {
          this.error.set('');
          this.projects.set(projects);
        },
        error: (error: unknown) => this.error.set(errorMessage(error)),
      });
  }
}
