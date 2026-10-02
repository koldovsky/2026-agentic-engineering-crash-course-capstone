import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Listing, ListingInput, ListingStatus } from './api-types';
import { mapProblems } from './problem';

@Injectable({ providedIn: 'root' })
export class ListingsService {
  private readonly http = inject(HttpClient);

  listByProject(projectId: string): Observable<Listing[]> {
    return this.http.get<Listing[]>(`/api/projects/${projectId}/listings`).pipe(mapProblems());
  }

  create(projectId: string, input: ListingInput): Observable<Listing> {
    return this.http
      .post<Listing>(`/api/projects/${projectId}/listings`, input)
      .pipe(mapProblems());
  }

  get(id: string): Observable<Listing> {
    return this.http.get<Listing>(`/api/listings/${id}`).pipe(mapProblems());
  }

  update(id: string, input: ListingInput): Observable<Listing> {
    return this.http.put<Listing>(`/api/listings/${id}`, input).pipe(mapProblems());
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/listings/${id}`).pipe(mapProblems());
  }

  setStatus(id: string, status: ListingStatus): Observable<Listing> {
    return this.http.patch<Listing>(`/api/listings/${id}/status`, { status }).pipe(mapProblems());
  }
}
