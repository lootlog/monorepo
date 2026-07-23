import { getFixedT } from "@/i18n/get-fixed-t";
import { isApiError } from "@lootlog/api-client/transport";
import { ActivePartyGatheringError } from "./active-party-gathering-error";

export const getCreatePartyGatheringErrorMessage = (error: unknown): string => {
  const t = getFixedT("partyFinder");
  const defaultMessage = t("errors.defaultCreate");

  if (error instanceof ActivePartyGatheringError) {
    return t("errors.activeGatheringExists");
  }

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
  const errorCode =
    typeof error.data === "object" &&
    error.data !== null &&
    "code" in error.data &&
    typeof error.data.code === "string"
      ? error.data.code
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

  if (responseStatus === 409 && errorCode === "ACTIVE_GATHERING_EXISTS") {
    return t("errors.activeGatheringExists");
  }

  if (responseStatus === 409 && errorCode === "ALREADY_JOINED_ELSEWHERE") {
    return t("errors.characterAlreadyInReadyRoom");
  }

  return defaultMessage;
};
