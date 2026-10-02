import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Offer, OfferCreate, OfferFit, OfferUpdate } from './api-types';
import { mapProblems } from './problem';

@Injectable({ providedIn: 'root' })
export class OffersService {
  private readonly http = inject(HttpClient);

  listByItem(itemId: string): Observable<Offer[]> {
    return this.http.get<Offer[]>(`/api/items/${itemId}/offers`).pipe(mapProblems());
  }

  listByListing(listingId: string): Observable<Offer[]> {
    return this.http.get<Offer[]>(`/api/listings/${listingId}/offers`).pipe(mapProblems());
  }

  create(itemId: string, input: OfferCreate): Observable<Offer> {
    return this.http.post<Offer>(`/api/items/${itemId}/offers`, input).pipe(mapProblems());
  }

  update(id: string, input: OfferUpdate): Observable<Offer> {
    return this.http.put<Offer>(`/api/offers/${id}`, input).pipe(mapProblems());
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/offers/${id}`).pipe(mapProblems());
  }

  setFit(id: string, fit: OfferFit): Observable<Offer> {
    return this.http.patch<Offer>(`/api/offers/${id}/fit`, { fit }).pipe(mapProblems());
  }

  setChoice(id: string, isChosen: boolean): Observable<Offer> {
    return this.http.patch<Offer>(`/api/offers/${id}/choice`, { isChosen }).pipe(mapProblems());
  }
}
