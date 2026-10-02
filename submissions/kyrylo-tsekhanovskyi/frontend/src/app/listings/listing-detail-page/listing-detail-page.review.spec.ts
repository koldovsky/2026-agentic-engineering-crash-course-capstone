import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { buttonByText, dialogElement, pickOption, selectedText, settle } from '../../testing/dom';
import { aListing, anOffer } from '../../testing/fixtures';
import { expectRequest } from '../../testing/http';
import { pageTestProviders } from '../../testing/providers';
import { ListingDetailPage } from './listing-detail-page';

describe('ListingDetailPage review fixes', () => {
  let fixture: ComponentFixture<ListingDetailPage>;
  let http: HttpTestingController;

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

  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((e) => (e.innerHTML = ''));
  });

  const page = () => fixture.nativeElement as HTMLElement;

  async function load() {
    expectRequest(http, 'GET', '/api/listings/l1').flush(aListing({ status: 'Contacted' }));
    expectRequest(http, 'GET', '/api/listings/l1/offers').flush([]);
    await settle(fixture);
  }

  it('review: the listing detail page reloads when the route id changes and ignores a superseded response', async () => {
    fixture.componentRef.setInput('listingId', 'l2');
    await settle(fixture);
    http
      .match('/api/listings/l2')
      .filter((r) => !r.cancelled)
      .forEach((r) => r.flush(aListing({ id: 'l2', title: 'Battery ad' })));
    http
      .match('/api/listings/l2/offers')
      .filter((r) => !r.cancelled)
      .forEach((r) => r.flush([]));
    http
      .match('/api/listings/l1')
      .filter((r) => !r.cancelled)
      .forEach((r) => r.flush(aListing({ title: 'Stale ad' })));
    http
      .match('/api/listings/l1/offers')
      .filter((r) => !r.cancelled)
      .forEach((r) => r.flush([anOffer()]));
    await settle(fixture);

    expect(page().querySelector('h1')?.textContent).toContain('Battery ad');
    expect(page().querySelectorAll('tr.offer-row').length).toBe(0);
  });

  it('review: the listing status selector shows the persisted status again after a failed PATCH', async () => {
    await load();
    const select = page().querySelector<HTMLElement>('mat-select.status-select')!;
    await pickOption(fixture, select!, 'Scam');

    expectRequest(http, 'PATCH', '/api/listings/l1/status').flush(
      { title: 'Bad status', status: 400, errors: { status: ['Bad'] } },
      { status: 400, statusText: 'Bad Request' },
    );
    await settle(fixture);

    expect(selectedText(select)).toBe('Contacted');
  });

  it('review: the offers collection shows a loading state while pending', async () => {
    expect(page().querySelector('.loading')).not.toBeNull();
    expect(page().textContent).not.toContain('not linked to any item yet');
  });

  it('review: a listing page destroyed before its delete response arrives does not navigate', async () => {
    await load();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

    buttonByText('Delete listing').click();
    await settle(fixture);
    buttonByText('Delete', dialogElement()!).click();
    await settle(fixture);
    const del = http.match({ method: 'DELETE', url: '/api/listings/l1' });
    fixture.destroy();
    del.forEach((r) => {
      if (!r.cancelled) r.flush(null, { status: 204, statusText: 'No Content' });
    });

    expect(navigate).not.toHaveBeenCalled();
  });
});
