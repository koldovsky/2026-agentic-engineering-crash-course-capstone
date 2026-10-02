import { Signal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  Observable,
  Subject,
  catchError,
  combineLatest,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { errorMessage } from '../api/problem';

/**
 * Loads a value for the current route id, in an injection context. A new id or a reload cancels the
 * previous request, so a superseded response is never shown. `value` is null while the first load
 * for an id is pending; `error` holds this load's own failure.
 */
export class Loader<T> {
  readonly value = signal<T | null>(null);
  readonly error = signal('');
  private readonly reloads = new Subject<void>();

  constructor(id: Signal<string>, fetch: (id: string) => Observable<T>) {
    let currentId: string | null = null;
    combineLatest([toObservable(id), this.reloads.pipe(startWith(undefined))])
      .pipe(
        tap(([next]) => {
          if (next !== currentId) {
            currentId = next;
            this.value.set(null);
            this.error.set('');
          }
        }),
        switchMap(([next]) =>
          fetch(next).pipe(
            map((value) => ({ ok: true as const, value })),
            catchError((error: unknown) => of({ ok: false as const, error })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (result.ok) {
          this.error.set('');
          this.value.set(result.value);
        } else {
          this.error.set(errorMessage(result.error));
        }
      });
  }

  reload(): void {
    this.reloads.next();
  }

  /** True while nothing is loaded and nothing failed. */
  loading(): boolean {
    return this.value() === null && this.error() === '';
  }
}
