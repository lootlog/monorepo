import { notFound } from "@tanstack/react-router";
import {
  getApiErrorMessage,
  getApiErrorStatus,
} from "@/lib/api-client/api-client";

export const getRouteErrorStatus = (error: unknown) => {
  return getApiErrorStatus(error);
};

export const getRouteErrorMessage = getApiErrorMessage;

export const throwNotFoundIfResponseMatches = (error: unknown) => {
  if (getRouteErrorStatus(error) === 404) {
    throw notFound({ throw: true });
  }

  throw error;
};
