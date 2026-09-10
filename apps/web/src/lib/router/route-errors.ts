import { isCancelledError } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import {
  getApiErrorMessage,
  getApiErrorStatus,
} from "@lootlog/client/transport";

export const getRouteErrorStatus = getApiErrorStatus;

export const getRouteErrorMessage = getApiErrorMessage;

export const normalizeRouteErrorStatus = (
  status: number | undefined,
): 401 | 403 | 404 | 500 => {
  if (status === 401 || status === 403 || status === 404) {
    return status;
  }

  return 500;
};

const createRouteLoaderAbortError = () => {
  const error = new Error("Route loader was cancelled");
  error.name = "AbortError";

  return error;
};

export const withRouteLoaderCancellation = async <T>(
  abortController: AbortController,
  loader: () => Promise<T>,
) => {
  try {
    return await loader();
  } catch (error) {
    if (isCancelledError(error)) {
      if (abortController.signal.aborted) {
        throw createRouteLoaderAbortError();
      }

      throw error;
    }

    throw error;
  }
};

export const throwForbiddenRouteError = (message = ""): never => {
  const forbiddenError = Object.assign(new Error(message), { status: 403 });

  throw forbiddenError;
};

export const rethrowNotFoundOrError = (cause: unknown): never => {
  if (getRouteErrorStatus(cause) === 404) {
    throw notFound({ throw: true });
  }

  throw cause;
};
