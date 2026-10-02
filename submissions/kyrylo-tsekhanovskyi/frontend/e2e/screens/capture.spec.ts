import { expect, test, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';
import { screensDir } from '../../playwright.screens.config';

// Visual review capture (tasks.md 17.1). Seeds its own demo project through the API so that every
// state is visible (bundle listing, WrongItem fit, chosen offer, several statuses and currencies),
// takes one full-page screenshot per screen, and deletes the project again.

interface Seed {
  projectId: string;
  inverterId: string;
  bundleListingId: string;
}

let api: APIRequestContext;
let seed: Seed;

async function post<T>(url: string, data: unknown): Promise<T> {
  const response = await api.post(url, { data });
  expect(response.ok(), `${url}: ${response.status()} ${await response.text()}`).toBeTruthy();
  return (await response.json()) as T;
}

async function patch(url: string, data: unknown): Promise<void> {
  const response = await api.patch(url, { data });
  expect(response.ok(), `${url}: ${response.status()} ${await response.text()}`).toBeTruthy();
}

const uah = (amount: number) => ({ amount, currency: 'UAH' });

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ playwright, baseURL }) => {
  api = await playwright.request.newContext({ baseURL });
  const project = await post<{ id: string }>('/api/projects', {
    name: `Screens demo ${new Date().toISOString().slice(0, 16)}`,
    description: 'Temporary project for the visual review; deleted after the capture.',
  });
  const item = (name: string, quantity: number, notes: string | null) =>
    post<{ id: string }>(`/api/projects/${project.id}/items`, { name, quantity, notes });
  const inverter = await item('Inverter', 1, 'Hybrid, 6 kW, 48 V');
  const battery = await item('Battery', 2, 'LiFePO4, 5 kWh each');
  const cable = await item('Solar cable', 50, null);

  const listing = (body: object) =>
    post<{ id: string }>(`/api/projects/${project.id}/listings`, body);
  const bundle = await listing({
    title: 'Inverter + battery bundle',
    url: 'https://www.olx.ua/d/uk/obyavlenie/deye-sun-6k-bundle-with-two-batteries-ID123456.html?reason=search',
    platform: 'OLX',
    sellerName: 'Oleh',
    sellerContact: '+380 67 000 00 00',
    notes: 'Can deliver by Nova Poshta',
    agreedTotal: null,
  });
  const shop = await listing({
    title: 'Deye SUN-6K hybrid inverter',
    url: 'https://rozetka.com.ua/deye-sun-6k/p123456/',
    platform: 'Rozetka',
    sellerName: null,
    sellerContact: null,
    notes: null,
    agreedTotal: null,
  });
  const scam = await listing({
    title: 'Too-cheap battery',
    url: 'https://www.olx.ua/d/uk/obyavlenie/battery-ID999.html',
    platform: 'OLX',
    sellerName: 'Unknown',
    sellerContact: null,
    notes: 'Asked for prepayment to a card',
    agreedTotal: null,
  });

  const offer = (itemId: string, body: object) =>
    post<{ id: string }>(`/api/items/${itemId}/offers`, body);
  const bundleInverter = await offer(inverter.id, {
    listingId: bundle.id,
    askingPrice: uah(42000),
    agreedPrice: uah(40000),
  });
  await offer(inverter.id, {
    listingId: shop.id,
    askingPrice: { amount: 1050, currency: 'EUR' },
    agreedPrice: null,
  });
  const bundleBattery = await offer(battery.id, {
    listingId: bundle.id,
    askingPrice: uah(28000),
    agreedPrice: null,
  });
  await offer(battery.id, { listingId: scam.id, askingPrice: uah(9000), agreedPrice: null });

  await patch(`/api/offers/${bundleInverter.id}/choice`, { isChosen: true });
  await patch(`/api/offers/${bundleInverter.id}/fit`, { fit: 'Fits' });
  await patch(`/api/offers/${bundleBattery.id}/fit`, { fit: 'WrongItem' });
  await patch(`/api/listings/${bundle.id}/status`, { status: 'Negotiating' });
  await patch(`/api/listings/${scam.id}/status`, { status: 'Scam' });
  await patch(`/api/items/${inverter.id}/status`, { status: 'Sourcing' });
  await patch(`/api/items/${cable.id}/status`, { status: 'Ordered' });

  seed = { projectId: project.id, inverterId: inverter.id, bundleListingId: bundle.id };
});

test.afterAll(async () => {
  if (seed) await api.delete(`/api/projects/${seed.projectId}`);
  await api?.dispose();
});

async function capture(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.waitForLoadState('networkidle');
  // Let Material's enter/hint animations finish, so the shot shows the settled state.
  await page.waitForTimeout(600);
  // A dialog's backdrop only covers the viewport, so dialogs are shot at viewport size.
  const dialogOpen = await page.getByRole('dialog').isVisible();
  await page.screenshot({
    path: `${screensDir}/${testInfo.project.name}-${name}.png`,
    fullPage: !dialogOpen,
  });
}

test('01 project list', async ({ page }, testInfo) => {
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  await capture(page, testInfo, '01-project-list');
});

test('02 project detail, items', async ({ page }, testInfo) => {
  await page.goto(`/projects/${seed.projectId}`);
  await expect(page.getByText('Inverter').first()).toBeVisible();
  await capture(page, testInfo, '02-project-items');
});

test('03 project detail, listings', async ({ page }, testInfo) => {
  await page.goto(`/projects/${seed.projectId}`);
  await page.getByRole('tab', { name: 'Listings' }).click();
  await expect(page.getByText('Inverter + battery bundle').first()).toBeVisible();
  await capture(page, testInfo, '03-project-listings');
});

test('04 item detail', async ({ page }, testInfo) => {
  await page.goto(`/items/${seed.inverterId}`);
  await expect(page.getByRole('heading', { name: 'Inverter' })).toBeVisible();
  await capture(page, testInfo, '04-item-detail');
});

test('05 listing detail', async ({ page }, testInfo) => {
  await page.goto(`/listings/${seed.bundleListingId}`);
  await expect(page.getByRole('heading', { name: 'Inverter + battery bundle' })).toBeVisible();
  await capture(page, testInfo, '05-listing-detail');
});

async function openDialog(page: Page, url: string, button: RegExp): Promise<void> {
  await page.goto(url);
  await page.getByRole('button', { name: button }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test('06 add offer dialog', async ({ page }, testInfo) => {
  await openDialog(page, `/items/${seed.inverterId}`, /add offer/i);
  await capture(page, testInfo, '06-add-offer-dialog');
});

test('07 new project dialog', async ({ page }, testInfo) => {
  await openDialog(page, '/projects', /new project/i);
  await capture(page, testInfo, '07-new-project-dialog');
});

test('08 edit project dialog', async ({ page }, testInfo) => {
  await openDialog(page, `/projects/${seed.projectId}`, /edit project/i);
  await capture(page, testInfo, '08-edit-project-dialog');
});

test('09 add item dialog', async ({ page }, testInfo) => {
  await openDialog(page, `/projects/${seed.projectId}`, /add item/i);
  await capture(page, testInfo, '09-add-item-dialog');
});

test('10 add listing dialog, with validation hints', async ({ page }, testInfo) => {
  await openDialog(page, `/projects/${seed.projectId}`, /add listing/i);
  // Submitting empty shows the required-field hints, so alignment with errors is reviewed too.
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /create/i })
    .click();
  await capture(page, testInfo, '10-add-listing-dialog-errors');
});

test('11 edit prices dialog', async ({ page }, testInfo) => {
  await openDialog(page, `/items/${seed.inverterId}`, /edit prices/i);
  await capture(page, testInfo, '11-edit-prices-dialog');
});
