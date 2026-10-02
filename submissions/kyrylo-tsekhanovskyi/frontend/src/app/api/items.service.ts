import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Item, ItemInput, ItemStatus } from './api-types';
import { mapProblems } from './problem';

@Injectable({ providedIn: 'root' })
export class ItemsService {
  private readonly http = inject(HttpClient);

  listByProject(projectId: string): Observable<Item[]> {
    return this.http.get<Item[]>(`/api/projects/${projectId}/items`).pipe(mapProblems());
  }

  create(projectId: string, input: ItemInput): Observable<Item> {
    return this.http.post<Item>(`/api/projects/${projectId}/items`, input).pipe(mapProblems());
  }

  get(id: string): Observable<Item> {
    return this.http.get<Item>(`/api/items/${id}`).pipe(mapProblems());
  }

  update(id: string, input: ItemInput): Observable<Item> {
    return this.http.put<Item>(`/api/items/${id}`, input).pipe(mapProblems());
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/items/${id}`).pipe(mapProblems());
  }

  setStatus(id: string, status: ItemStatus): Observable<Item> {
    return this.http.patch<Item>(`/api/items/${id}/status`, { status }).pipe(mapProblems());
  }
}
