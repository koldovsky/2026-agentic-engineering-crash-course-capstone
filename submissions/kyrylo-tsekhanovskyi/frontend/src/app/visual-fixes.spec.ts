import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ItemDetailPage } from './items/item-detail-page/item-detail-page';
import { ListingDetailPage } from './listings/listing-detail-page/listing-detail-page';
import { ProjectDetailPage } from './projects/project-detail-page/project-detail-page';
import { ProjectListPage } from './projects/project-list-page/project-list-page';
import { selectedText, settle } from './testing/dom';
import { aListing, aProject, aSummary, anItem, anOffer } from './testing/fixtures';
import { expectRequest } from './testing/http';
import { pageTestProviders } from './testing/providers';

const text = (el: Element | null | undefined) =>
  (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('Visual review fixes', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: pageTestProviders() });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((e) => (e.innerHTML = ''));
  });

  async function projectPage() {
    const fixture = TestBed.createComponent(ProjectDetailPage);
    fixture.componentRef.setInput('projectId', 'p1');
    await settle(fixture);
    expectRequest(http, 'GET', '/api/projects/p1').flush(aProject());
    expectRequest(http, 'GET', '/api/projects/p1/items').flush([
      anItem({ id: 'a', status: 'Needed' }),
      anItem({ id: 'b', status: 'Sourcing' }),
      anItem({ id: 'c', status: 'Ordered' }),
      anItem({ id: 'd', status: 'Received' }),
    ]);
    expectRequest(http, 'GET', '/api/projects/p1/listings').flush([
      aListing({ status: 'NotResponding' }),
    ]);
    expectRequest(http, 'GET', '/api/projects/p1/summary').flush(aSummary());
    await settle(fixture);
    return fixture;
  }

  async function openListingsTab(fixture: Awaited<ReturnType<typeof projectPage>>) {
    const page = fixture.nativeElement as HTMLElement;
    Array.from(page.querySelectorAll<HTMLElement>('[role="tab"]'))
      .find((t) => t.textContent?.includes('Listings'))!
      .click();
    await settle(fixture);
    return page;
  }

  async function listingPage() {
    const fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('listingId', 'l1');
    await settle(fixture);
    expectRequest(http, 'GET', '/api/listings/l1').flush(aListing({ status: 'NotResponding' }));
    expectRequest(http, 'GET', '/api/listings/l1/offers').flush([
      anOffer({ fit: 'WrongItem' }),
      anOffer({ id: 'o2', fit: 'NotQuiteRight' }),
    ]);
    await settle(fixture);
    return fixture.nativeElement as HTMLElement;
  }

  it('visual: the project listings stack on phone width with status kept visible', async () => {
    const page = await openListingsTab(await projectPage());
    const table = page.querySelector('table.listings-table')!;

    expect(table.classList).toContain('stack-on-phone');
    const status = table.querySelector('tr.listing-row td.status-cell')!;
    expect(status.getAttribute('data-label')).toBe('Status');
    expect(status.querySelector('.status-chip')).not.toBeNull();
  });

  it('visual: the listing offers stack on phone width with fit kept visible', async () => {
    const page = await listingPage();
    const table = page.querySelector('table.offers-table')!;

    expect(table.classList).toContain('stack-on-phone');
    const fit = table.querySelector('tr.offer-row td.fit-cell')!;
    expect(fit.getAttribute('data-label')).toBe('Fit');
    expect(fit.querySelector('.status-chip')).not.toBeNull();
  });

  it('visual: status and fit values use human labels in chips and selects', async () => {
    const listing = await listingPage();
    const fits = Array.from(listing.querySelectorAll('tr.offer-row .fit')).map(text);
    expect(fits).toEqual(['Wrong item', 'Not quite right']);
    expect(selectedText(listing.querySelector<HTMLElement>('mat-select.status-select')!)).toBe(
      'Not responding',
    );

    const project = await openListingsTab(await projectPage());
    expect(text(project.querySelector('tr.listing-row .status-chip'))).toBe('Not responding');
  });

  it('visual: the item page fit menu uses human labels', async () => {
    const fixture = TestBed.createComponent(ItemDetailPage);
    fixture.componentRef.setInput('itemId', 'i1');
    await settle(fixture);
    expectRequest(http, 'GET', '/api/items/i1').flush(anItem());
    expectRequest(http, 'GET', '/api/items/i1/offers').flush([anOffer({ fit: 'NotQuiteRight' })]);
    await settle(fixture);
    const page = fixture.nativeElement as HTMLElement;

    expect(text(page.querySelector('.offer-row .fit'))).toBe('Not quite right');
    page.querySelector<HTMLButtonElement>('.offer-row button[aria-label="Change fit"]')!.click();
    await settle(fixture);
    const items = Array.from(document.querySelectorAll('[mat-menu-item]')).map(text);
    expect(items).toEqual(['Unverified', 'Fits', 'Not quite right', 'Wrong item']);
  });

  it('visual: the project list pluralizes counts', async () => {
    const fixture = TestBed.createComponent(ProjectListPage);
    await settle(fixture);
    expectRequest(http, 'GET', '/api/projects').flush([
      { ...aProject(), itemCount: 1, listingCount: 1 },
      { ...aProject({ id: 'p2' }), itemCount: 2, listingCount: 0 },
    ]);
    await settle(fixture);
    const metas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.meta')).map(
      (meta) => Array.from(meta.children).map(text),
    );

    expect(metas[0].slice(0, 2)).toEqual(['1 item', '1 listing']);
    expect(metas[1].slice(0, 2)).toEqual(['2 items', '0 listings']);
  });

  it('visual: the listing page shows its status once', async () => {
    const page = await listingPage();

    expect(page.querySelector('.status-panel .status-chip')).toBeNull();
    expect(page.querySelector('.status-panel mat-select')).not.toBeNull();
  });

  it('visual: the four item statuses have distinct tones', async () => {
    const page = (await projectPage()).nativeElement as HTMLElement;
    const tones = Array.from(page.querySelectorAll('tr.item-row .status-chip')).map((c) =>
      c.getAttribute('data-tone'),
    );

    expect(tones.every(Boolean)).toBe(true);
    expect(new Set(tones).size).toBe(4);
  });
});
