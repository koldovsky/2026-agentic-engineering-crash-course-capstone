import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectListEntry } from '../../api/api-types';
import { expectNoRequest, expectRequest } from '../../testing/http';
import { buttonByText, dialogElement, setInput, settle } from '../../testing/dom';
import { pageTestProviders } from '../../testing/providers';
import { ProjectListPage } from './project-list-page';

describe('ProjectListPage', () => {
  let fixture: ComponentFixture<ProjectListPage>;
  let http: HttpTestingController;

  const solar: ProjectListEntry = {
    id: 'p1',
    name: 'Solar station',
    description: null,
    createdAt: '2026-09-30T10:00:00Z',
    itemCount: 2,
    listingCount: 1,
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ProjectListPage],
      providers: pageTestProviders(),
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProjectListPage);
    await settle(fixture);
  });

  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((e) => (e.innerHTML = ''));
  });

  const page = () => fixture.nativeElement as HTMLElement;

  async function loadProjects(projects: ProjectListEntry[]) {
    expectRequest(http, 'GET', '/api/projects').flush(projects);
    await settle(fixture);
  }

  it('projects: Empty project list', async () => {
    await loadProjects([]);

    const empty = page().querySelector('.empty-state');
    expect(empty).not.toBeNull();
    expect(buttonByText('New project', empty!)).toBeTruthy();
  });

  it('projects: Create a project from the UI', async () => {
    await loadProjects([]);

    buttonByText('New project').click();
    await settle(fixture);
    const dialog = dialogElement();
    expect(dialog).not.toBeNull();
    setInput(
      dialog!.querySelector<HTMLInputElement>('input[formControlName="name"]')!,
      'Solar station',
    );
    await settle(fixture);
    buttonByText('Create', dialog!).click();
    await settle(fixture);

    const create = expectRequest(http, 'POST', '/api/projects');
    expect(create.request.body).toEqual({ name: 'Solar station', description: null });
    create.flush({ ...solar, itemCount: undefined, listingCount: undefined });
    await settle(fixture);
    await loadProjects([solar]);

    expect(page().textContent).toContain('Solar station');
  });

  it('projects: Confirm before deleting', async () => {
    await loadProjects([solar]);

    buttonByText('Delete', page()).click();
    await settle(fixture);
    const dialog = dialogElement();
    expect(dialog?.textContent).toContain('Solar station');
    expectNoRequest(http, 'DELETE');

    buttonByText('Delete', dialog!).click();
    await settle(fixture);

    expectRequest(http, 'DELETE', '/api/projects/p1').flush(null, {
      status: 204,
      statusText: 'No Content',
    });
    await settle(fixture);
    await loadProjects([]);
    expect(page().querySelector('.empty-state')).not.toBeNull();
  });
});
