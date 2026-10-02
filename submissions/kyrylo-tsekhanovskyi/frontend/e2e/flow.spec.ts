import { expect, test, type Page } from '@playwright/test';

// Task 13.1 — projects: From project to total (E2E).
// The whole MVP-1 flow through the UI, against the stack started by the AppHost. A uniquely named
// project is used and deleted at the end, so the developer's own data is never touched.

const BUNDLE = 'Inverter + battery bundle';

async function submitDialog(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /create|save/i }).click();
  await expect(dialog).toBeHidden();
}

async function openItem(page: Page, projectUrl: string, item: string): Promise<void> {
  await page.goto(projectUrl);
  await page.getByRole('link', { name: item, exact: true }).click();
  await expect(page.getByRole('heading', { name: item })).toBeVisible();
}

async function addOffer(page: Page, askingUah: string): Promise<void> {
  await page.getByRole('button', { name: 'Add offer' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Listing').selectOption({ label: BUNDLE });
  await dialog.getByLabel('Asking unit price').fill(askingUah);
  await submitDialog(page);
}

test('projects: From project to total', async ({ page }) => {
  const name = `Solar station e2e ${Date.now()}`;
  let projectUrl = '';
  try {
    // Create the project.
    await page.goto('/projects');
    await page.getByRole('button', { name: 'New project' }).click();
    await page.getByRole('dialog').getByLabel('Name').fill(name);
    await submitDialog(page);
    await page.getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name })).toBeVisible();
    projectUrl = new URL(page.url()).pathname;

    // Add the items "Inverter" (×1) and "Battery" (×2).
    for (const [item, quantity] of [
      ['Inverter', '1'],
      ['Battery', '2'],
    ]) {
      await page.getByRole('button', { name: 'Add item' }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Name').fill(item);
      await dialog.getByLabel('Quantity').fill(quantity);
      await submitDialog(page);
    }

    // Add one OLX listing.
    await page.getByRole('button', { name: 'Add listing' }).click();
    const listingDialog = page.getByRole('dialog');
    await listingDialog.getByLabel('Title').fill(BUNDLE);
    await listingDialog
      .getByLabel('URL')
      .fill('https://www.olx.ua/d/uk/obyavlenie/bundle-ID1.html');
    await listingDialog.getByLabel('Platform').fill('OLX');
    await submitDialog(page);

    // Link it to both items with UAH prices; choose the inverter offer.
    await openItem(page, projectUrl, 'Inverter');
    await addOffer(page, '12000');
    await page.getByRole('button', { name: 'Choose' }).click();
    await expect(page.getByText('Chosen').first()).toBeVisible();

    // Mark the battery offer WrongItem.
    await openItem(page, projectUrl, 'Battery');
    await addOffer(page, '8000');
    await page.getByRole('button', { name: 'Change fit' }).click();
    await page.getByRole('menuitem', { name: 'Wrong item' }).click();
    await expect(page.getByText('Wrong item').first()).toBeVisible();

    // Set the listing to Negotiating.
    await page.goto(projectUrl);
    await page.getByRole('tab', { name: 'Listings' }).click();
    await page.getByRole('link', { name: BUNDLE }).click();
    await page.getByRole('combobox', { name: 'Status' }).click();
    await page.getByRole('option', { name: 'Negotiating' }).click();
    await expect(page.getByRole('combobox', { name: 'Status' })).toContainText('Negotiating');

    // The project page shows the outcome.
    await page.goto(projectUrl);
    // Scoped to the summary card: the items table also shows the chosen offer's price.
    await expect(page.locator('mat-card').filter({ hasText: 'Summary' })).toContainText(
      '12,000.00 UAH',
    );
    const batteryRow = page.getByRole('row', { name: /Battery/ });
    await expect(batteryRow).toContainText('—'); // no chosen offer
    await expect(page.getByText(/Items without a chosen offer:\s*1/)).toBeVisible();
    await page.getByRole('tab', { name: 'Listings' }).click();
    await expect(
      page.getByRole('row', { name: new RegExp(BUNDLE.replace(/[+]/g, '\\+')) }),
    ).toContainText('Negotiating');
  } finally {
    if (projectUrl) {
      await page.request.delete(`/api${projectUrl}`);
    }
  }
});
