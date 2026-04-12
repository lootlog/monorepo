import { API_URL } from "@/config/api";
import {
  type ApiError,
  buildRequestUrl,
  executeApiRequest,
} from "@/lib/api-client/api-client";

export type ErrorType<TError> = ApiError<TError>;
export type BodyType<TBody> = TBody;

export const orvalFetch = <TData>(
  path: string,
  requestInit: RequestInit = {},
): Promise<TData> => {
  const baseURL =
    API_URL ??
    (typeof window !== "undefined" ? window.location.origin : undefined);

  if (!baseURL) {
    throw new Error("API_URL must be configured when window is unavailable.");
  }

  const requestUrl = buildRequestUrl({
    baseURL,
    path,
  });

  return executeApiRequest<TData>({
    url: requestUrl,
    method: requestInit.method ?? "GET",
    requestInit,
  });
};
