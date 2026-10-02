import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Item, Listing, ProjectSummary } from '../../api/api-types';
import { buttonByText, dialogElement, setInput, settle } from '../../testing/dom';
import { aListing, aProject, aSummary, anItem } from '../../testing/fixtures';
import { expectRequest } from '../../testing/http';
import { pageTestProviders } from '../../testing/providers';
import { ProjectDetailPage } from './project-detail-page';

describe('ProjectDetailPage', () => {
  let fixture: ComponentFixture<ProjectDetailPage>;
  let http: HttpTestingController;

  const inverter = anItem({
    id: 'i1',
    name: 'Inverter',
    quantity: 1,
    status: 'Sourcing',
    chosenOffer: {
      offerId: 'o1',
      listingId: 'l1',
      listingTitle: 'Deye inverter 5 kW',
      unitPrice: { amount: 12000, currency: 'UAH' },
    },
  });
  const panels = anItem({ id: 'i2', name: 'Solar panel', quantity: 6, status: 'Needed' });

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ProjectDetailPage],
      providers: pageTestProviders(),
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProjectDetailPage);
    fixture.componentRef.setInput('projectId', 'p1');
    await settle(fixture);
  });

  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((e) => (e.innerHTML = ''));
  });

  const page = () => fixture.nativeElement as HTMLElement;

  async function load(
    items: Item[] = [inverter, panels],
    listings: Listing[] = [],
    summary: ProjectSummary = aSummary(),
  ) {
    expectRequest(http, 'GET', '/api/projects/p1').flush(aProject());
    expectRequest(http, 'GET', '/api/projects/p1/items').flush(items);
    expectRequest(http, 'GET', '/api/projects/p1/listings').flush(listings);
    expectRequest(http, 'GET', '/api/projects/p1/summary').flush(summary);
    await settle(fixture);
  }

  function rows(): HTMLElement[] {
    return Array.from(page().querySelectorAll<HTMLElement>('tr.item-row'));
  }

  it('items: Items table', async () => {
    await load();

    const [first, second] = rows();
    expect(first.textContent).toContain('Inverter');
    expect(first.querySelector('.qty')?.textContent?.trim()).toBe('1');
    expect(first.querySelector('.status-chip')?.textContent?.trim()).toBe('Sourcing');
    expect(first.textContent).toContain('Deye inverter 5 kW');
    expect(first.textContent).toContain('12,000.00 UAH');
    expect(second.textContent).toContain('Solar panel');
    expect(second.querySelector('.qty')?.textContent?.trim()).toBe('6');
    expect(second.querySelector('.chosen')?.textContent?.trim()).toBe('—');
  });

  it('items: Change status from the items table', async () => {
    await load();

    rows()[0].querySelector<HTMLButtonElement>('button.status-trigger')!.click();
    await settle(fixture);
    buttonByText('Ordered').click();
    await settle(fixture);

    const patch = expectRequest(http, 'PATCH', '/api/items/i1/status');
    expect(patch.request.body).toEqual({ status: 'Ordered' });
    patch.flush({ ...inverter, status: 'Ordered' });
    await settle(fixture);
    http
      .match(() => true)
      .forEach((r) => r.flush(r.request.url.endsWith('/summary') ? aSummary() : []));
    await settle(fixture);

    expect(rows()[0].querySelector('.status-chip')?.textContent?.trim()).toBe('Ordered');
  });

  it('listings: Listings tab', async () => {
    await load(
      [],
      [
        aListing({
          id: 'l1',
          title: 'Deye inverter 5 kW',
          platform: 'OLX',
          sellerName: 'Petro',
          status: 'Negotiating',
        }),
      ],
    );

    const tab = Array.from(page().querySelectorAll<HTMLElement>('[role="tab"]')).find((t) =>
      t.textContent?.includes('Listings'),
    );
    tab!.click();
    await settle(fixture);

    const row = page().querySelector<HTMLElement>('tr.listing-row');
    expect(row).not.toBeNull();
    const link = row!.querySelector<HTMLAnchorElement>('a');
    expect(link?.textContent?.trim()).toBe('Deye inverter 5 kW');
    expect(link?.getAttribute('href')).toBe('/listings/l1');
    expect(row!.textContent).toContain('OLX');
    expect(row!.textContent).toContain('Petro');
    expect(row!.querySelector('.status-chip')?.textContent?.trim()).toBe('Negotiating');
  });

  it('listings: Platform suggestions with free text', async () => {
    await load();

    buttonByText('Add listing').click();
    await settle(fixture);
    const dialog = dialogElement()!;
    const platform = dialog.querySelector<HTMLInputElement>('input[formControlName="platform"]')!;
    platform.dispatchEvent(new Event('focusin'));
    platform.dispatchEvent(new Event('focus'));
    await settle(fixture);

    const options = Array.from(document.querySelectorAll('mat-option')).map((o) =>
      o.textContent?.trim(),
    );
    expect(options).toEqual(['OLX', 'eBay', 'Allegro', 'Amazon', 'Rozetka', 'Prom']);

    setInput(
      dialog.querySelector<HTMLInputElement>('input[formControlName="title"]')!,
      'Cable 6 mm',
    );
    setInput(
      dialog.querySelector<HTMLInputElement>('input[formControlName="url"]')!,
      'https://kidstaff.com.ua/x',
    );
    setInput(platform, 'Kidstaff');
    await settle(fixture);
    buttonByText('Create', dialog).click();
    await settle(fixture);

    const create = expectRequest(http, 'POST', '/api/projects/p1/listings');
    expect(create.request.body.platform).toBe('Kidstaff');
  });

  it('projects: Summary card on the project page', async () => {
    await load(
      [inverter, panels],
      [],
      aSummary({
        totals: [
          { amount: 250, currency: 'EUR' },
          { amount: 12000, currency: 'UAH' },
        ],
        itemsWithoutChosenOffer: [{ id: 'i2', name: 'Solar panel' }],
      }),
    );

    const card = page().querySelector<HTMLElement>('.summary-card')!;
    const lines = Array.from(card.querySelectorAll('.total-line')).map((l) =>
      l.textContent?.trim(),
    );
    expect(lines).toEqual(['250.00 EUR', '12,000.00 UAH']);
    expect(card.querySelector('.without-choice')?.textContent).toContain('1');
  });
});
