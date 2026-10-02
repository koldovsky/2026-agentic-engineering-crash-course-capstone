import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Offer } from '../../api/api-types';
import { pickOption, selectedText, settle } from '../../testing/dom';
import { aListing, anOffer } from '../../testing/fixtures';
import { expectRequest } from '../../testing/http';
import { pageTestProviders } from '../../testing/providers';
import { ListingDetailPage } from './listing-detail-page';

describe('ListingDetailPage', () => {
  let fixture: ComponentFixture<ListingDetailPage>;
  let http: HttpTestingController;

  const listing = aListing({
    id: 'l1',
    title: 'Solar kit bundle',
    status: 'Contacted',
    statusChangedAt: '2026-09-29T08:00:00Z',
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ListingDetailPage],
      providers: pageTestProviders(),
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('listingId', 'l1');
    await settle(fixture);
  });

  const page = () => fixture.nativeElement as HTMLElement;

  async function load(offers: Offer[] = []) {
    expectRequest(http, 'GET', '/api/listings/l1').flush(listing);
    expectRequest(http, 'GET', '/api/listings/l1/offers').flush(offers);
    await settle(fixture);
  }

  it('listings: Change status on the listing page', async () => {
    await load();

    const select = page().querySelector<HTMLElement>('mat-select.status-select');
    expect(select).not.toBeNull();
    await pickOption(fixture, select!, 'Not responding');

    const patch = expectRequest(http, 'PATCH', '/api/listings/l1/status');
    expect(patch.request.body).toEqual({ status: 'NotResponding' });
    patch.flush({ ...listing, status: 'NotResponding', statusChangedAt: '2026-09-30T12:30:00Z' });
    await settle(fixture);

    expect(selectedText(select!)).toBe('Not responding');
    expect(page().querySelector('time.status-time')?.getAttribute('datetime')).toBe(
      '2026-09-30T12:30:00Z',
    );
  });

  it('listings: Offers across items', async () => {
    await load([
      anOffer({
        id: 'o1',
        itemId: 'i1',
        itemName: 'Inverter',
        askingPrice: { amount: 12000, currency: 'UAH' },
        agreedPrice: { amount: 11500, currency: 'UAH' },
        fit: 'Fits',
        isChosen: true,
      }),
      anOffer({
        id: 'o2',
        itemId: 'i2',
        itemName: 'Battery',
        askingPrice: { amount: 300, currency: 'EUR' },
        agreedPrice: null,
        fit: 'NotQuiteRight',
        isChosen: false,
      }),
    ]);

    const rows = Array.from(page().querySelectorAll<HTMLElement>('tr.offer-row'));
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Inverter');
    expect(rows[0].textContent).toContain('12,000.00 UAH');
    expect(rows[0].textContent).toContain('11,500.00 UAH');
    expect(rows[0].querySelector('.fit')?.textContent?.trim()).toBe('Fits');
    expect(rows[0].querySelector('.chosen')?.textContent?.trim()).toBe('Chosen');
    expect(rows[1].textContent).toContain('Battery');
    expect(rows[1].textContent).toContain('300.00 EUR');
    expect(rows[1].querySelector('.fit')?.textContent?.trim()).toBe('Not quite right');
    expect(rows[1].querySelector('.chosen')?.textContent?.trim()).toBe('—');
  });
});
