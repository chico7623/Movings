/**
 * Result utility types for predictable success/error flows.
 */
export type Success<T> = {
  success: true;
  data: T;
};

export type Failure<E = Error> = {
  success: false;
  error: E;
};

export type Result<T, E = Error> = Success<T> | Failure<E>;

export function success<T>(data: T): Success<T> {
  return { success: true, data };
}

export function failure<E = Error>(error: E): Failure<E> {
  return { success: false, error };
}
