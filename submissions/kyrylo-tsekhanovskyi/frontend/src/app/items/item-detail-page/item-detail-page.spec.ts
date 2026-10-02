import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Offer } from '../../api/api-types';
import { buttonByText, dialogElement, setInput, settle } from '../../testing/dom';
import { aListing, anItem, anOffer } from '../../testing/fixtures';
import { expectRequest } from '../../testing/http';
import { pageTestProviders } from '../../testing/providers';
import { ItemDetailPage } from './item-detail-page';

describe('ItemDetailPage', () => {
  let fixture: ComponentFixture<ItemDetailPage>;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [ItemDetailPage], providers: pageTestProviders() });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ItemDetailPage);
    fixture.componentRef.setInput('itemId', 'i1');
    await settle(fixture);
  });

  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((e) => (e.innerHTML = ''));
  });

  const page = () => fixture.nativeElement as HTMLElement;
  const offerRows = () => Array.from(page().querySelectorAll<HTMLElement>('.offer-row'));

  async function load(offers: Offer[]) {
    expectRequest(http, 'GET', '/api/items/i1').flush(anItem());
    expectRequest(http, 'GET', '/api/items/i1/offers').flush(offers);
    await settle(fixture);
  }

  async function reloadOffers(offers: Offer[]) {
    expectRequest(http, 'GET', '/api/items/i1/offers').flush(offers);
    http.match('/api/items/i1').forEach((r) => r.flush(anItem()));
    await settle(fixture);
  }

  it('offers: Link a listing from the item page', async () => {
    await load([]);

    buttonByText('Add offer').click();
    await settle(fixture);
    expectRequest(http, 'GET', '/api/projects/p1/listings').flush([
      aListing({ id: 'l1', title: 'Deye inverter 5 kW' }),
      aListing({ id: 'l2', title: 'Growatt inverter' }),
    ]);
    await settle(fixture);

    const dialog = dialogElement()!;
    const select = dialog.querySelector<HTMLSelectElement>('select[formControlName="listingId"]')!;
    const options = Array.from(select.options).map((o) => o.textContent?.trim());
    expect(options).toContain('Growatt inverter');
    select.value =
      select.options[Array.from(select.options).findIndex((o) => o.value === 'l2')].value;
    select.dispatchEvent(new Event('change'));
    setInput(
      dialog.querySelector<HTMLInputElement>(
        '[formGroupName="askingPrice"] input[formControlName="amount"]',
      )!,
      '12000',
    );
    await settle(fixture);
    buttonByText('Create', dialog).click();
    await settle(fixture);

    const create = expectRequest(http, 'POST', '/api/items/i1/offers');
    expect(create.request.body).toEqual({
      listingId: 'l2',
      askingPrice: { amount: 12000, currency: 'UAH' },
      agreedPrice: null,
    });
    const created = anOffer({
      id: 'o2',
      listingId: 'l2',
      listingTitle: 'Growatt inverter',
      askingPrice: { amount: 12000, currency: 'UAH' },
    });
    create.flush(created);
    await settle(fixture);
    await reloadOffers([created]);

    const [row] = offerRows();
    expect(row.textContent).toContain('Growatt inverter');
    expect(row.textContent).toContain('12,000.00 UAH');
    expect(row.querySelector('.fit')?.textContent?.trim()).toBe('Unverified');
  });

  it('offers: Choose an offer from the item page', async () => {
    const first = anOffer({ id: 'o1', listingTitle: 'Deye inverter 5 kW', isChosen: true });
    const second = anOffer({ id: 'o2', listingId: 'l2', listingTitle: 'Growatt inverter' });
    await load([first, second]);

    buttonByText('Choose', offerRows()[1]).click();
    await settle(fixture);

    const patch = expectRequest(http, 'PATCH', '/api/offers/o2/choice');
    expect(patch.request.body).toEqual({ isChosen: true });
    patch.flush({ ...second, isChosen: true });
    await settle(fixture);
    await reloadOffers([
      { ...first, isChosen: false },
      { ...second, isChosen: true },
    ]);

    const chosen = offerRows().filter((r) => r.classList.contains('chosen'));
    expect(chosen.length).toBe(1);
    expect(chosen[0].textContent).toContain('Growatt inverter');
  });

  it('offers: Wrong items are visible', async () => {
    await load([anOffer({ id: 'o1', fit: 'WrongItem' }), anOffer({ id: 'o2', fit: 'Fits' })]);

    const [wrong, fits] = offerRows();
    expect(wrong.querySelector('.fit')?.textContent?.trim()).toBe('Wrong item');
    expect(wrong.querySelector('.fit')?.classList).toContain('fit-warning');
    expect(fits.querySelector('.fit')?.classList).not.toContain('fit-warning');
  });
});
