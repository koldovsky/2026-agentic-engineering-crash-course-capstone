import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Project, ProjectInput, ProjectListEntry, ProjectSummary } from './api-types';
import { mapProblems } from './problem';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);

  list(): Observable<ProjectListEntry[]> {
    return this.http.get<ProjectListEntry[]>('/api/projects').pipe(mapProblems());
  }

  create(input: ProjectInput): Observable<Project> {
    return this.http.post<Project>('/api/projects', input).pipe(mapProblems());
  }

  get(id: string): Observable<Project> {
    return this.http.get<Project>(`/api/projects/${id}`).pipe(mapProblems());
  }

  update(id: string, input: ProjectInput): Observable<Project> {
    return this.http.put<Project>(`/api/projects/${id}`, input).pipe(mapProblems());
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/projects/${id}`).pipe(mapProblems());
  }

  summary(id: string): Observable<ProjectSummary> {
    return this.http.get<ProjectSummary>(`/api/projects/${id}/summary`).pipe(mapProblems());
  }
}
