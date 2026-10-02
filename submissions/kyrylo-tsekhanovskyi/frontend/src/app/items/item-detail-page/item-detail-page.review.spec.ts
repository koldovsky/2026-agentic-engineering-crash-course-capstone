import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { buttonByText, dialogElement, settle } from '../../testing/dom';
import { anItem, anOffer } from '../../testing/fixtures';
import { expectRequest } from '../../testing/http';
import { pageTestProviders } from '../../testing/providers';
import { ItemDetailPage } from './item-detail-page';

describe('ItemDetailPage review fixes', () => {
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
  const fail = { status: 500, statusText: 'Error' };

  it('review: the item detail page reloads when the route id changes and ignores a superseded response', async () => {
    fixture.componentRef.setInput('itemId', 'i2');
    await settle(fixture);
    http
      .match('/api/items/i2')
      .filter((r) => !r.cancelled)
      .forEach((r) => r.flush(anItem({ id: 'i2', name: 'Battery' })));
    http
      .match('/api/items/i2/offers')
      .filter((r) => !r.cancelled)
      .forEach((r) => r.flush([]));
    http
      .match('/api/items/i1')
      .filter((r) => !r.cancelled)
      .forEach((r) => r.flush(anItem({ name: 'Stale item' })));
    http
      .match('/api/items/i1/offers')
      .filter((r) => !r.cancelled)
      .forEach((r) => r.flush([anOffer()]));
    await settle(fixture);

    expect(page().querySelector('h1')?.textContent).toContain('Battery');
    expect(page().querySelectorAll('.offer-row').length).toBe(0);
  });

  it('review: a failed offers load stays visible when the item load succeeds later', async () => {
    expectRequest(http, 'GET', '/api/items/i1/offers').flush({ title: 'Offers failed' }, fail);
    await settle(fixture);
    expectRequest(http, 'GET', '/api/items/i1').flush(anItem());
    await settle(fixture);

    expect(page().textContent).toContain('Offers failed');
    expect(page().textContent).not.toContain('No offers yet');
  });

  it('review: the offers collection shows a loading state while pending', async () => {
    expect(page().querySelector('.loading')).not.toBeNull();
    expect(page().textContent).not.toContain('No offers yet');
  });

  it('review: a detail page destroyed before its delete response arrives neither navigates nor reloads', async () => {
    expectRequest(http, 'GET', '/api/items/i1').flush(anItem());
    expectRequest(http, 'GET', '/api/items/i1/offers').flush([]);
    await settle(fixture);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

    buttonByText('Delete item').click();
    await settle(fixture);
    buttonByText('Delete', dialogElement()!).click();
    await settle(fixture);
    const del = http.match({ method: 'DELETE', url: '/api/items/i1' });
    fixture.destroy();
    del.forEach((r) => {
      if (!r.cancelled) r.flush(null, { status: 204, statusText: 'No Content' });
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(http.match(() => true).length).toBe(0);
  });
});
