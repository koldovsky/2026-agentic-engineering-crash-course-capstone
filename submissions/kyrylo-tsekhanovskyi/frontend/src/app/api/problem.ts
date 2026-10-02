import { HttpErrorResponse } from '@angular/common/http';
import { MonoTypeOperatorFunction, catchError, throwError } from 'rxjs';
import type { RuleViolationProblemDetails, ValidationProblemDetails } from './api-types';

/** A failed API call, reduced to what the UI needs (design D4, D6). */
export type ApiError =
  | { kind: 'validation'; status: number; message: string; fieldErrors: Record<string, string[]> }
  | { kind: 'rule'; status: number; message: string; code: string }
  | { kind: 'other'; status: number; message: string };

const RULE_PREFIX = '/problems/';

/** Maps an RFC 9457 problem details response to an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return { kind: 'other', status: 0, message: String(error) };
  }
  const body: unknown = error.error;
  const title = isObject(body) && typeof body['title'] === 'string' ? body['title'] : error.message;

  if (error.status === 400 && isObject(body) && isObject(body['errors'])) {
    const problem = body as unknown as ValidationProblemDetails;
    return { kind: 'validation', status: 400, message: title, fieldErrors: { ...problem.errors } };
  }
  if (error.status === 409 && isObject(body) && typeof body['type'] === 'string') {
    const problem = body as unknown as RuleViolationProblemDetails;
    const code = problem.type.startsWith(RULE_PREFIX)
      ? problem.type.slice(RULE_PREFIX.length)
      : problem.type;
    return { kind: 'rule', status: 409, message: title, code };
  }
  return { kind: 'other', status: error.status, message: title };
}

/** RxJS operator that rethrows HTTP errors as ApiError values. */
export function mapProblems<T>(): MonoTypeOperatorFunction<T> {
  return catchError((error: unknown) => throwError(() => toApiError(error)));
}

/** A short user-facing text for an error. */
export function errorMessage(error: unknown): string {
  const apiError = isApiError(error) ? error : toApiError(error);
  return apiError.message || 'Something went wrong.';
}

function isApiError(value: unknown): value is ApiError {
  return isObject(value) && typeof value['kind'] === 'string' && 'status' in value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
