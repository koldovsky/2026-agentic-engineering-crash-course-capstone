import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { ITEM_STATUSES, Item, ItemStatus, Project } from '../../api/api-types';
import { ItemsService } from '../../api/items.service';
import { ListingsService } from '../../api/listings.service';
import { errorMessage } from '../../api/problem';
import { ProjectsService } from '../../api/projects.service';
import { ItemFormData, ItemFormDialog } from '../../items/item-form-dialog';
import { ListingFormData, ListingFormDialog } from '../../listings/listing-form-dialog';
import { ChipClassPipe, ItemTonePipe, LabelPipe } from '../../shared/display';
import { formDialogConfig } from '../../shared/form-dialog';
import { Loader } from '../../shared/loader';
import { MoneyPipe } from '../../shared/money';
import { ProjectFormData, ProjectFormDialog } from '../project-form-dialog';

@Component({
  selector: 'app-project-detail-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    ChipClassPipe,
    ItemTonePipe,
    LabelPipe,
    MatIconModule,
    MatMenuModule,
    MatTableModule,
    MatTabsModule,
    MoneyPipe,
    RouterLink,
  ],
  templateUrl: './project-detail-page.html',
  styleUrl: './project-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailPage {
  /** Route parameter (component input binding). */
  readonly projectId = input.required<string>();

  private readonly projectsApi = inject(ProjectsService);
  private readonly itemsApi = inject(ItemsService);
  private readonly listingsApi = inject(ListingsService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statuses = ITEM_STATUSES;
  protected readonly itemColumns = ['name', 'quantity', 'status', 'chosen'];
  protected readonly listingColumns = ['title', 'platform', 'seller', 'status'];

  protected readonly project = new Loader(this.projectId, (id) => this.projectsApi.get(id));
  protected readonly items = new Loader(this.projectId, (id) => this.itemsApi.listByProject(id));
  protected readonly listings = new Loader(this.projectId, (id) =>
    this.listingsApi.listByProject(id),
  );
  protected readonly summary = new Loader(this.projectId, (id) => this.projectsApi.summary(id));
  /** Errors of user actions (status changes). */
  protected readonly actionError = signal('');

  protected editProject(project: Project): void {
    this.dialog
      .open<ProjectFormDialog, ProjectFormData, Project>(
        ProjectFormDialog,
        formDialogConfig({ project }),
      )
      .afterClosed()
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => this.project.value.set(saved));
  }

  protected addItem(): void {
    this.dialog
      .open<ItemFormDialog, ItemFormData>(
        ItemFormDialog,
        formDialogConfig({ projectId: this.projectId() }),
      )
      .afterClosed()
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.items.reload();
        this.summary.reload();
      });
  }

  protected addListing(): void {
    this.dialog
      .open<ListingFormDialog, ListingFormData>(
        ListingFormDialog,
        formDialogConfig({ projectId: this.projectId() }),
      )
      .afterClosed()
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.listings.reload());
  }

  protected setStatus(item: Item, status: ItemStatus): void {
    this.itemsApi
      .setStatus(item.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.actionError.set('');
          this.items.value.update((items) =>
            (items ?? []).map((i) => (i.id === updated.id ? updated : i)),
          );
          this.summary.reload();
        },
        error: (error: unknown) => this.actionError.set(errorMessage(error)),
      });
  }
}
