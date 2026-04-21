import { getFixedT } from "@/i18n/get-fixed-t";
import { isApiError } from "@/lib/api-client";

export const getCreatePartyGatheringErrorMessage = (error: unknown): string => {
  const t = getFixedT("partyFinder");
  const defaultMessage = t("errors.defaultCreate");

  if (!isApiError(error)) {
    return defaultMessage;
  }

  const responseStatus = error.status;
  const errorMessage =
    typeof error.data === "object" &&
    error.data !== null &&
    "message" in error.data &&
    typeof error.data.message === "string"
      ? error.data.message
      : undefined;

  if (responseStatus === 403) {
    return t("errors.forbidden");
  }

  if (responseStatus === 429) {
    return t("errors.tooManyRequests");
  }

  if (responseStatus === 400) {
    return errorMessage || t("errors.invalidData");
  }

  return defaultMessage;
};
