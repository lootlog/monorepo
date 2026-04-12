import { isCancelledError } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import {
  getApiErrorMessage,
  getApiErrorStatus,
} from "@/lib/api-client/api-client";

export const getRouteErrorStatus = (error: unknown) => {
  return getApiErrorStatus(error);
};

export const getRouteErrorMessage = getApiErrorMessage;

export const isRouteLoaderCancelledError = (error: unknown) => {
  return isCancelledError(error);
};

export const throwForbiddenRouteError = (message = ""): never => {
  const forbiddenError = new Error(message) as Error & {
    status: number;
  };
  forbiddenError.status = 403;

  throw forbiddenError;
};

export const throwNotFoundIfResponseMatches = (error: unknown) => {
  if (getRouteErrorStatus(error) === 404) {
    throw notFound({ throw: true });
  }

  throw error;
};
