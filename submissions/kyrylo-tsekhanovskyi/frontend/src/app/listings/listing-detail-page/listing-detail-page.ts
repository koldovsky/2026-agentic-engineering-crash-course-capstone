import { DatePipe } from '@angular/common';
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
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { LISTING_STATUSES, Listing, ListingStatus } from '../../api/api-types';
import { ListingsService } from '../../api/listings.service';
import { OffersService } from '../../api/offers.service';
import { errorMessage } from '../../api/problem';
import { confirm } from '../../shared/confirm-dialog';
import { formDialogConfig } from '../../shared/form-dialog';
import { ChipClassPipe, HostPipe, LabelPipe } from '../../shared/display';
import { Loader } from '../../shared/loader';
import { MoneyPipe } from '../../shared/money';
import { ListingFormData, ListingFormDialog } from '../listing-form-dialog';

@Component({
  selector: 'app-listing-detail-page',
  imports: [
    ChipClassPipe,
    LabelPipe,
    DatePipe,
    HostPipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    MoneyPipe,
    RouterLink,
  ],
  templateUrl: './listing-detail-page.html',
  styleUrl: './listing-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingDetailPage {
  /** Route parameter (component input binding). */
  readonly listingId = input.required<string>();

  private readonly listingsApi = inject(ListingsService);
  private readonly offersApi = inject(OffersService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statuses = LISTING_STATUSES;
  protected readonly offerColumns = ['item', 'asking', 'agreed', 'fit', 'chosen'];
  protected readonly listing = new Loader(this.listingId, (id) => this.listingsApi.get(id));
  protected readonly offers = new Loader(this.listingId, (id) => this.offersApi.listByListing(id));
  protected readonly actionError = signal('');

  protected onStatusChange(status: ListingStatus, select: MatSelect, listing: Listing): void {
    this.listingsApi
      .setStatus(listing.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.actionError.set('');
          this.listing.value.set(updated);
        },
        error: (error: unknown) => {
          // Show the persisted status again.
          select.value = listing.status;
          this.actionError.set(errorMessage(error));
        },
      });
  }

  protected editListing(listing: Listing): void {
    this.dialog
      .open<ListingFormDialog, ListingFormData, Listing>(
        ListingFormDialog,
        formDialogConfig({ listing }),
      )
      .afterClosed()
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => this.listing.value.set(saved));
  }

  protected deleteListing(listing: Listing): void {
    confirm(this.dialog, {
      title: 'Delete listing',
      message: `Delete the listing "${listing.title}" and its offers? The items stay.`,
      confirmLabel: 'Delete',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.listingsApi.delete(listing.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigate(['/projects', listing.projectId]),
        error: (error: unknown) => this.actionError.set(errorMessage(error)),
      });
  }
}
