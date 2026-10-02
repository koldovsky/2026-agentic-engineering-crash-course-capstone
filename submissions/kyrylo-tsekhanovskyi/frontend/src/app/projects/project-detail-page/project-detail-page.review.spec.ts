import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { settle } from '../../testing/dom';
import { aProject, aSummary, anItem } from '../../testing/fixtures';
import { pageTestProviders } from '../../testing/providers';
import { ProjectDetailPage } from './project-detail-page';

describe('ProjectDetailPage review fixes', () => {
  let fixture: ComponentFixture<ProjectDetailPage>;
  let http: HttpTestingController;

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

  const page = () => fixture.nativeElement as HTMLElement;

  function flushProject(id: string, name: string) {
    http
      .match(`/api/projects/${id}`)
      .filter((r) => !r.cancelled)
      .forEach((r) => r.flush(aProject({ id, name })));
    http
      .match(`/api/projects/${id}/items`)
      .filter((r) => !r.cancelled)
      .forEach((r) => r.flush([anItem({ name: `${name} item` })]));
    http
      .match(`/api/projects/${id}/listings`)
      .filter((r) => !r.cancelled)
      .forEach((r) => r.flush([]));
    http
      .match(`/api/projects/${id}/summary`)
      .filter((r) => !r.cancelled)
      .forEach((r) => r.flush(aSummary({ projectId: id })));
  }

  it('review: the project detail page reloads when the route id changes and ignores a superseded response', async () => {
    fixture.componentRef.setInput('projectId', 'p2');
    await settle(fixture);
    flushProject('p2', 'Garden pump');
    flushProject('p1', 'Stale project');
    await settle(fixture);

    expect(page().textContent).not.toContain('Stale project');
    expect(page().querySelector('h1')?.textContent).toContain('Garden pump');
    expect(page().textContent).toContain('Garden pump item');
  });

  it('review: the items collection shows a loading state while pending and no empty message after a failure', async () => {
    expect(page().querySelector('.loading')).not.toBeNull();
    expect(page().textContent).not.toContain('No items yet');

    http
      .match('/api/projects/p1/items')
      .forEach((r) =>
        r.flush({ title: 'Boom', status: 500 }, { status: 500, statusText: 'Error' }),
      );
    await settle(fixture);

    expect(page().textContent).not.toContain('No items yet');
    expect(page().textContent).toContain('Boom');
  });
});
