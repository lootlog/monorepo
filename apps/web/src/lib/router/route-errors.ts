import { isAxiosError } from "axios";
import { notFound } from "@tanstack/react-router";

export const getRouteErrorStatus = (error: unknown) => {
  if (isAxiosError(error)) {
    return error.response?.status;
  }

  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }

  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return undefined;
};

export const getRouteErrorMessage = (error: unknown) => {
  if (isAxiosError(error)) {
    const apiMessage = error.response?.data;

    if (typeof apiMessage === "string") {
      return apiMessage;
    }

    if (
      apiMessage &&
      typeof apiMessage === "object" &&
      "message" in apiMessage &&
      typeof apiMessage.message === "string"
    ) {
      return apiMessage.message;
    }
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return undefined;
};

export const throwNotFoundIfResponseMatches = (error: unknown) => {
  if (getRouteErrorStatus(error) === 404) {
    throw notFound({ throw: true });
  }

  throw error;
};
