import {
  executeApiRequest,
  type ApiRequestOptions,
  type ApiError,
} from "@lootlog/client/transport";
export type ErrorType<T> = ApiError<T>;
export type BodyType<T> = T;
export const mainFetch = <T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<T> => executeApiRequest<T>("main", path, options);
export const activityFetch = <T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<T> => executeApiRequest<T>("activity", path, options);
export const battlelogFetch = <T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<T> => executeApiRequest<T>("battlelog", path, options);
export const searchFetch = <T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<T> => executeApiRequest<T>("search", path, options);
