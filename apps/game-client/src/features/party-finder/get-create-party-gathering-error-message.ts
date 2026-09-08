import { getFixedT } from "@/i18n/get-fixed-t";
import { getApiErrorStringField, isApiError } from "@lootlog/client/transport";
import { ActivePartyGatheringError } from "./active-party-gathering-error";

export const getCreatePartyGatheringErrorMessage = (cause: unknown): string => {
  const t = getFixedT("partyFinder");
  const defaultMessage = t("errors.defaultCreate");

  if (cause instanceof ActivePartyGatheringError) {
    return t("errors.activeGatheringExists");
  }

  if (!isApiError(cause)) {
    return defaultMessage;
  }

  const responseStatus = cause.status;
  const errorMessage = getApiErrorStringField(cause, "message");
  const errorCode = getApiErrorStringField(cause, "code");

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
