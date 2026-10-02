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
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink } from '@angular/router';
import { Observable, filter, switchMap } from 'rxjs';
import { ITEM_STATUSES, Item, ItemStatus, OFFER_FITS, Offer, OfferFit } from '../../api/api-types';
import { ItemsService } from '../../api/items.service';
import { OffersService } from '../../api/offers.service';
import { errorMessage } from '../../api/problem';
import { OfferFormData, OfferFormDialog } from '../../offers/offer-form-dialog';
import { confirm } from '../../shared/confirm-dialog';
import { formDialogConfig } from '../../shared/form-dialog';
import { ChipClassPipe, ItemTonePipe, LabelPipe } from '../../shared/display';
import { Loader } from '../../shared/loader';
import { MoneyPipe } from '../../shared/money';
import { ItemFormData, ItemFormDialog } from '../item-form-dialog';

@Component({
  selector: 'app-item-detail-page',
  imports: [
    ChipClassPipe,
    ItemTonePipe,
    LabelPipe,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MoneyPipe,
    RouterLink,
  ],
  templateUrl: './item-detail-page.html',
  styleUrl: './item-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemDetailPage {
  /** Route parameter (component input binding). */
  readonly itemId = input.required<string>();

  private readonly itemsApi = inject(ItemsService);
  private readonly offersApi = inject(OffersService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statuses = ITEM_STATUSES;
  protected readonly fits = OFFER_FITS;
  protected readonly item = new Loader(this.itemId, (id) => this.itemsApi.get(id));
  protected readonly offers = new Loader(this.itemId, (id) => this.offersApi.listByItem(id));
  /** Errors of user actions, kept apart from the load errors. */
  protected readonly actionError = signal('');

  protected editItem(item: Item): void {
    this.dialog
      .open<ItemFormDialog, ItemFormData, Item>(ItemFormDialog, formDialogConfig({ item }))
      .afterClosed()
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => this.item.value.set(saved));
  }

  protected deleteItem(item: Item): void {
    confirm(this.dialog, {
      title: 'Delete item',
      message: `Delete the item "${item.name}" and its offers?`,
      confirmLabel: 'Delete',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.itemsApi.delete(item.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => void this.router.navigate(['/projects', item.projectId]),
        error: (error: unknown) => this.actionError.set(errorMessage(error)),
      });
  }

  protected setStatus(item: Item, status: ItemStatus): void {
    this.run(this.itemsApi.setStatus(item.id, status), (updated) => this.item.value.set(updated));
  }

  protected addOffer(item: Item): void {
    this.openOfferDialog({ itemId: item.id, projectId: item.projectId });
  }

  protected editPrices(offer: Offer): void {
    this.openOfferDialog({ offer });
  }

  protected setFit(offer: Offer, fit: OfferFit): void {
    this.run(this.offersApi.setFit(offer.id, fit), () => this.offers.reload());
  }

  protected setChoice(offer: Offer, isChosen: boolean): void {
    this.run(this.offersApi.setChoice(offer.id, isChosen), () => this.reloadAll());
  }

  protected deleteOffer(offer: Offer): void {
    confirm(this.dialog, {
      title: 'Delete offer',
      message: `Delete the offer from "${offer.listingTitle}"?`,
      confirmLabel: 'Delete',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.offersApi.delete(offer.id)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => this.reloadAll(),
        error: (error: unknown) => this.actionError.set(errorMessage(error)),
      });
  }

  private openOfferDialog(data: OfferFormData): void {
    this.dialog
      .open<OfferFormDialog, OfferFormData, Offer>(OfferFormDialog, formDialogConfig(data))
      .afterClosed()
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reloadAll());
  }

  private run<T>(call: Observable<T>, next: (value: T) => void): void {
    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (value) => {
        this.actionError.set('');
        next(value);
      },
      error: (error: unknown) => this.actionError.set(errorMessage(error)),
    });
  }

  /** The item carries its chosen offer, so both are reloaded after a change of offers. */
  private reloadAll(): void {
    this.item.reload();
    this.offers.reload();
  }
}
