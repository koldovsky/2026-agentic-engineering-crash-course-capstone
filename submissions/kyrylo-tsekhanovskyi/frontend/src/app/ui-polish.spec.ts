import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { ItemDetailPage } from './items/item-detail-page/item-detail-page';
import { ListingDetailPage } from './listings/listing-detail-page/listing-detail-page';
import { ProjectDetailPage } from './projects/project-detail-page/project-detail-page';
import { ProjectListPage } from './projects/project-list-page/project-list-page';
import { buttonByText, dialogElement, settle } from './testing/dom';
import { aListing, aProject, aSummary, anItem, anOffer } from './testing/fixtures';
import { expectRequest } from './testing/http';
import { pageTestProviders } from './testing/providers';

const text = (el: Element | null | undefined) =>
  (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('UI polish', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: pageTestProviders() });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((e) => (e.innerHTML = ''));
  });

  it('polish: the app toolbar has its own container background', async () => {
    const fixture = TestBed.createComponent(App);
    await settle(fixture);

    const toolbar = (fixture.nativeElement as HTMLElement).querySelector('mat-toolbar');
    expect(toolbar?.classList).toContain('app-toolbar');
    const rules = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('\n');
    expect(rules).toMatch(/\.app-toolbar[^{]*\{[^}]*--mat-toolbar-container-background-color/);
  });

  it('polish: status and fit chips carry per-value classes, and clickable chips show a dropdown icon', async () => {
    const fixture = TestBed.createComponent(ProjectDetailPage);
    fixture.componentRef.setInput('projectId', 'p1');
    await settle(fixture);
    expectRequest(http, 'GET', '/api/projects/p1').flush(aProject());
    expectRequest(http, 'GET', '/api/projects/p1/items').flush([anItem({ status: 'Ordered' })]);
    expectRequest(http, 'GET', '/api/projects/p1/listings').flush([
      aListing({ status: 'NotResponding' }),
    ]);
    expectRequest(http, 'GET', '/api/projects/p1/summary').flush(aSummary());
    await settle(fixture);
    const page = fixture.nativeElement as HTMLElement;

    const trigger = page.querySelector('tr.item-row button.status-trigger')!;
    expect(trigger.querySelector('.status-chip')?.classList).toContain('status-ordered');
    expect(text(trigger.querySelector('mat-icon'))).toBe('arrow_drop_down');

    Array.from(page.querySelectorAll<HTMLElement>('[role="tab"]'))
      .find((t) => t.textContent?.includes('Listings'))!
      .click();
    await settle(fixture);
    expect(page.querySelector('tr.listing-row .status-chip')?.classList).toContain(
      'listing-not-responding',
    );
  });

  describe('item page', () => {
    async function itemPage(notes: string | null = 'Hybrid, 5 kW') {
      const fixture = TestBed.createComponent(ItemDetailPage);
      fixture.componentRef.setInput('itemId', 'i1');
      await settle(fixture);
      expectRequest(http, 'GET', '/api/items/i1').flush(anItem({ notes }));
      expectRequest(http, 'GET', '/api/items/i1/offers').flush([
        anOffer({ listingStatus: 'Found', fit: 'WrongItem' }),
      ]);
      await settle(fixture);
      return fixture;
    }

    it('polish: the offer card labels its chips', async () => {
      const page = (await itemPage()).nativeElement as HTMLElement;
      const row = page.querySelector('.offer-row')!;

      expect(text(row)).toContain('Listing: Found');
      expect(text(row)).toContain('Fit: Wrong item');
      expect(row.querySelector('.fit')?.classList).toContain('fit-wrong-item');
    });

    it('polish: the item page shows the quantity and labelled notes without a dangling separator', async () => {
      const page = (await itemPage()).nativeElement as HTMLElement;

      expect(text(page.querySelector('.quantity'))).toBe('Quantity: 1');
      expect(text(page.querySelector('header'))).not.toMatch(/·\s*$/);
      expect(text(page.querySelector('.notes-label'))).toBe('Notes');
      expect(text(page.querySelector('.notes'))).toContain('Hybrid, 5 kW');
    });

    it('polish: destructive actions on the item page differ from edit actions', async () => {
      const page = (await itemPage()).nativeElement as HTMLElement;

      expect(buttonByText('Delete item', page).classList).toContain('destructive');
      expect(buttonByText('Delete', page.querySelector('.offer-row')!).classList).toContain(
        'destructive',
      );
      expect(buttonByText('Edit item', page).classList).not.toContain('destructive');
    });

    it('polish: the listing picker in "Add offer" has an untruncated label', async () => {
      const fixture = await itemPage();
      buttonByText('Add offer', fixture.nativeElement as HTMLElement).click();
      await settle(fixture);
      expectRequest(http, 'GET', '/api/projects/p1/listings').flush([aListing()]);
      await settle(fixture);

      const dialog = dialogElement()!;
      const field = dialog
        .querySelector('select[formControlName="listingId"]')!
        .closest('mat-form-field')!;
      expect(text(field.querySelector('mat-label'))).toBe('Listing');
      const select = field.querySelector('select')!;
      expect(text(select.options[0])).toBe('');
      expect(text(field.querySelector('mat-hint'))).toBe('A listing of this project');
    });
  });

  describe('listing page', () => {
    async function listingPage() {
      const fixture = TestBed.createComponent(ListingDetailPage);
      fixture.componentRef.setInput('listingId', 'l1');
      await settle(fixture);
      expectRequest(http, 'GET', '/api/listings/l1').flush(
        aListing({ status: 'Scam', statusChangedAt: '2026-09-30T12:30:45Z' }),
      );
      expectRequest(http, 'GET', '/api/listings/l1/offers').flush([anOffer()]);
      await settle(fixture);
      return fixture.nativeElement as HTMLElement;
    }

    it('polish: listing status is changed with a Material select', async () => {
      const page = await listingPage();

      expect(page.querySelector('mat-select.status-select')).not.toBeNull();
      expect(page.querySelector('select')).toBeNull();
      expect(page.querySelector('mat-select.status-select')?.classList).toContain('listing-scam');
    });

    it('polish: the listing URL is a short "Open ad" link with the host name', async () => {
      const page = await listingPage();
      const link = page.querySelector<HTMLAnchorElement>('a.open-ad')!;

      expect(text(link)).toContain('Open ad');
      expect(text(link)).toContain('olx.ua');
      expect(text(page)).not.toContain('/d/obyavlenie/deye');
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
      expect(link.getAttribute('href')).toBe('https://www.olx.ua/d/obyavlenie/deye');
    });

    it('polish: the status time is shown without seconds', async () => {
      const page = await listingPage();
      const time = text(page.querySelector('time.status-time'));

      expect(time).toMatch(/\d{1,2}:\d{2}/);
      expect(time).not.toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it('polish: the offer table uses short price headers with the unit meaning in a tooltip', async () => {
      const page = await listingPage();
      const headers = Array.from(page.querySelectorAll('th')).map((th) => th);
      const asking = headers.find((th) => text(th) === 'Asking');
      const agreed = headers.find((th) => text(th) === 'Agreed');

      expect(asking?.getAttribute('title')).toBe('Asking price per unit');
      expect(agreed?.getAttribute('title')).toBe('Agreed price per unit');
    });

    it('polish: delete listing is styled as destructive', async () => {
      const page = await listingPage();

      expect(buttonByText('Delete listing', page).classList).toContain('destructive');
      expect(buttonByText('Edit listing', page).classList).not.toContain('destructive');
    });
  });

  it('polish: delete project is styled as destructive', async () => {
    const fixture = TestBed.createComponent(ProjectListPage);
    await settle(fixture);
    expectRequest(http, 'GET', '/api/projects').flush([
      { ...aProject(), itemCount: 1, listingCount: 1 },
    ]);
    await settle(fixture);

    expect(buttonByText('Delete', fixture.nativeElement as HTMLElement).classList).toContain(
      'destructive',
    );
  });
});
