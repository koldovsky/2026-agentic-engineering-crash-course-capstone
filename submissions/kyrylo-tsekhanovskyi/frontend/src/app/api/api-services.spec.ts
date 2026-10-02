import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, firstValueFrom } from 'rxjs';
import { ItemsService } from './items.service';
import { ListingsService } from './listings.service';
import { OffersService } from './offers.service';
import { ApiError } from './problem';
import { ProjectsService } from './projects.service';

describe('API services', () => {
  let http: HttpTestingController;
  let projects: ProjectsService;
  let items: ItemsService;
  let listings: ListingsService;
  let offers: OffersService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    projects = TestBed.inject(ProjectsService);
    items = TestBed.inject(ItemsService);
    listings = TestBed.inject(ListingsService);
    offers = TestBed.inject(OffersService);
  });

  afterEach(() => http.verify());

  /** Subscribes, then expects exactly one request with the given method, URL and body. */
  function expectCall(
    call: Observable<unknown>,
    method: string,
    url: string,
    body: unknown = null,
  ) {
    const done = firstValueFrom(call, { defaultValue: undefined });
    const req = http.expectOne({ method, url });
    expect(req.request.body).toEqual(body);
    req.flush(method === 'DELETE' ? null : {}, {
      status: method === 'DELETE' ? 204 : 200,
      statusText: 'OK',
    });
    return done;
  }

  const money = { amount: 12000, currency: 'UAH' };

  it('api: projects service uses the contract operations', async () => {
    await expectCall(projects.list(), 'GET', '/api/projects');
    await expectCall(projects.create({ name: 'A' }), 'POST', '/api/projects', { name: 'A' });
    await expectCall(projects.get('p1'), 'GET', '/api/projects/p1');
    await expectCall(
      projects.update('p1', { name: 'B', description: 'd' }),
      'PUT',
      '/api/projects/p1',
      { name: 'B', description: 'd' },
    );
    await expectCall(projects.delete('p1'), 'DELETE', '/api/projects/p1');
    await expectCall(projects.summary('p1'), 'GET', '/api/projects/p1/summary');
  });

  it('api: items service uses the contract operations', async () => {
    const input = { name: 'Inverter', quantity: 1, notes: null };
    await expectCall(items.listByProject('p1'), 'GET', '/api/projects/p1/items');
    await expectCall(items.create('p1', input), 'POST', '/api/projects/p1/items', input);
    await expectCall(items.get('i1'), 'GET', '/api/items/i1');
    await expectCall(items.update('i1', input), 'PUT', '/api/items/i1', input);
    await expectCall(items.delete('i1'), 'DELETE', '/api/items/i1');
    await expectCall(items.setStatus('i1', 'Ordered'), 'PATCH', '/api/items/i1/status', {
      status: 'Ordered',
    });
  });

  it('api: listings service uses the contract operations', async () => {
    const input = { title: 'T', url: 'https://olx.ua/x', platform: 'OLX' };
    await expectCall(listings.listByProject('p1'), 'GET', '/api/projects/p1/listings');
    await expectCall(listings.create('p1', input), 'POST', '/api/projects/p1/listings', input);
    await expectCall(listings.get('l1'), 'GET', '/api/listings/l1');
    await expectCall(listings.update('l1', input), 'PUT', '/api/listings/l1', input);
    await expectCall(listings.delete('l1'), 'DELETE', '/api/listings/l1');
    await expectCall(listings.setStatus('l1', 'Scam'), 'PATCH', '/api/listings/l1/status', {
      status: 'Scam',
    });
  });

  it('api: offers service uses the contract operations', async () => {
    await expectCall(offers.listByItem('i1'), 'GET', '/api/items/i1/offers');
    await expectCall(offers.listByListing('l1'), 'GET', '/api/listings/l1/offers');
    await expectCall(
      offers.create('i1', { listingId: 'l1', askingPrice: money }),
      'POST',
      '/api/items/i1/offers',
      { listingId: 'l1', askingPrice: money },
    );
    await expectCall(
      offers.update('o1', { askingPrice: money, agreedPrice: null }),
      'PUT',
      '/api/offers/o1',
      { askingPrice: money, agreedPrice: null },
    );
    await expectCall(offers.delete('o1'), 'DELETE', '/api/offers/o1');
    await expectCall(offers.setFit('o1', 'WrongItem'), 'PATCH', '/api/offers/o1/fit', {
      fit: 'WrongItem',
    });
    await expectCall(offers.setChoice('o1', true), 'PATCH', '/api/offers/o1/choice', {
      isChosen: true,
    });
  });

  async function failWith(
    call: Observable<unknown>,
    status: number,
    body: object,
  ): Promise<ApiError> {
    const result = firstValueFrom(call).then(
      () => {
        throw new Error('expected an error');
      },
      (e: unknown) => e as ApiError,
    );
    http.expectOne(() => true).flush(body, { status, statusText: 'Error' });
    return result;
  }

  it('api: a 400 problem details response is mapped to field errors', async () => {
    const error = await failWith(projects.create({ name: '' }), 400, {
      title: 'One or more validation errors occurred.',
      status: 400,
      errors: { name: ['The name is required.'], 'askingPrice.amount': ['Too many decimals.'] },
    });

    expect(error.kind).toBe('validation');
    expect(error.kind === 'validation' && error.fieldErrors).toEqual({
      name: ['The name is required.'],
      'askingPrice.amount': ['Too many decimals.'],
    });
  });

  it('api: a 409 problem details response is mapped to its rule code', async () => {
    const error = await failWith(offers.create('i1', { listingId: 'l1' }), 409, {
      type: '/problems/duplicate-offer',
      title: 'The item is already linked to this listing.',
      status: 409,
    });

    expect(error.kind).toBe('rule');
    expect(error.kind === 'rule' && error.code).toBe('duplicate-offer');
    expect(error.message).toBe('The item is already linked to this listing.');
  });

  it('api: other errors keep their status', async () => {
    const error = await failWith(projects.get('x'), 404, { title: 'Not Found', status: 404 });

    expect(error.kind).toBe('other');
    expect(error.status).toBe(404);
  });
});
