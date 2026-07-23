import {
  type ApiRequestOptions,
  type ApiError,
  executeApiRequest,
} from "./transport";

export type ErrorType<TError> = ApiError<TError>;
export type BodyType<TBody> = TBody;

export function mainFetch<TData>(
  path: string,
  options?: ApiRequestOptions,
): Promise<TData> {
  return executeApiRequest<TData>("main", path, options);
}

export function authFetch<TData>(
  path: string,
  options?: ApiRequestOptions,
): Promise<TData> {
  return executeApiRequest<TData>("auth", path, options);
}

export function battlelogFetch<TData>(
  path: string,
  options?: ApiRequestOptions,
): Promise<TData> {
  return executeApiRequest<TData>("battlelog", path, options);
}

export function searchFetch<TData>(
  path: string,
  options?: ApiRequestOptions,
): Promise<TData> {
  return executeApiRequest<TData>("search", path, options);
}

export function activityFetch<TData>(
  path: string,
  options?: ApiRequestOptions,
): Promise<TData> {
  return executeApiRequest<TData>("activity", path, options);
}
