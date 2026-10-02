import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemDetailPage } from './items/item-detail-page/item-detail-page';
import { ProjectDetailPage } from './projects/project-detail-page/project-detail-page';
import { ProjectListPage } from './projects/project-list-page/project-list-page';
import { buttonByText, dialogElement, settle } from './testing/dom';
import { aListing, aProject, aSummary, anItem, anOffer } from './testing/fixtures';
import { expectRequest } from './testing/http';
import { pageTestProviders } from './testing/providers';

/** The form controls of the open dialog, in DOM order, as "group.control" paths. */
function fieldOrder(form: Element): string[] {
  return Array.from(form.querySelectorAll('[formcontrolname]')).map((el) => {
    const group = el.closest('[formgroupname]')?.getAttribute('formgroupname');
    const name = el.getAttribute('formcontrolname')!;
    return group ? `${group}.${name}` : name;
  });
}

/** Asserts the shared layout: one .dialog-form column, rows only for amount + currency, shared width. */
function expectSharedLayout(expectedOrder: string[]) {
  const dialog = dialogElement()!;
  const form = dialog.querySelector('.dialog-form')!;
  expect(form).not.toBeNull();
  expect(fieldOrder(form)).toEqual(expectedOrder);

  for (const child of Array.from(form.children)) {
    const ok =
      child.matches('mat-form-field') ||
      child.matches('.form-row') ||
      child.matches('p.form-error, p.dialog-context');
    expect(
      ok,
      `unexpected dialog-form child <${child.tagName.toLowerCase()} class="${child.className}">`,
    ).toBe(true);
  }
  for (const row of Array.from(form.querySelectorAll('.form-row'))) {
    expect(fieldOrder(row).map((p) => p.split('.').pop())).toEqual(['amount', 'currency']);
  }
  expect(document.querySelector('.cdk-overlay-pane')?.classList).toContain('app-form-dialog');
}

describe('Dialog layout', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: pageTestProviders() });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((e) => (e.innerHTML = ''));
  });

  async function click(fixture: ComponentFixture<unknown>, label: string) {
    buttonByText(label, fixture.nativeElement as HTMLElement).click();
    await settle(fixture);
  }

  async function projectListPage() {
    const fixture = TestBed.createComponent(ProjectListPage);
    await settle(fixture);
    expectRequest(http, 'GET', '/api/projects').flush([
      { ...aProject(), itemCount: 0, listingCount: 0 },
    ]);
    await settle(fixture);
    return fixture;
  }

  async function projectPage() {
    const fixture = TestBed.createComponent(ProjectDetailPage);
    fixture.componentRef.setInput('projectId', 'p1');
    await settle(fixture);
    expectRequest(http, 'GET', '/api/projects/p1').flush(aProject());
    expectRequest(http, 'GET', '/api/projects/p1/items').flush([]);
    expectRequest(http, 'GET', '/api/projects/p1/listings').flush([]);
    expectRequest(http, 'GET', '/api/projects/p1/summary').flush(aSummary());
    await settle(fixture);
    return fixture;
  }

  async function itemPage() {
    const fixture = TestBed.createComponent(ItemDetailPage);
    fixture.componentRef.setInput('itemId', 'i1');
    await settle(fixture);
    expectRequest(http, 'GET', '/api/items/i1').flush(anItem());
    expectRequest(http, 'GET', '/api/items/i1/offers').flush([anOffer()]);
    await settle(fixture);
    return fixture;
  }

  it('layout: the project list separates its heading row from the list', async () => {
    const page = (await projectListPage()).nativeElement as HTMLElement;

    const header = page.querySelector(':scope > .page-header');
    expect(header?.querySelector('h1')).not.toBeNull();
    const content = page.querySelector(':scope > section.page-content');
    expect(content?.querySelector('.project-list')).not.toBeNull();
  });

  it('layout: the new project dialog uses the shared single-column form', async () => {
    const fixture = await projectListPage();
    await click(fixture, 'New project');

    expectSharedLayout(['name', 'description']);
  });

  it('layout: the edit project dialog uses the shared single-column form', async () => {
    const fixture = await projectPage();
    await click(fixture, 'Edit project');

    expectSharedLayout(['name', 'description']);
  });

  it('layout: the add item dialog uses the shared single-column form', async () => {
    const fixture = await projectPage();
    await click(fixture, 'Add item');

    expectSharedLayout(['name', 'quantity', 'notes']);
  });

  it('layout: the add listing dialog uses the shared single-column form', async () => {
    const fixture = await projectPage();
    await click(fixture, 'Add listing');

    expectSharedLayout([
      'title',
      'url',
      'platform',
      'sellerName',
      'sellerContact',
      'notes',
      'agreedTotal.amount',
      'agreedTotal.currency',
    ]);
  });

  it('layout: the add offer dialog uses the shared single-column form', async () => {
    const fixture = await itemPage();
    await click(fixture, 'Add offer');
    expectRequest(http, 'GET', '/api/projects/p1/listings').flush([aListing()]);
    await settle(fixture);

    expectSharedLayout([
      'listingId',
      'askingPrice.amount',
      'askingPrice.currency',
      'agreedPrice.amount',
      'agreedPrice.currency',
    ]);
  });

  it('layout: the edit prices dialog uses the shared single-column form', async () => {
    const fixture = await itemPage();
    await click(fixture, 'Edit prices');

    expectSharedLayout([
      'askingPrice.amount',
      'askingPrice.currency',
      'agreedPrice.amount',
      'agreedPrice.currency',
    ]);
  });
});
