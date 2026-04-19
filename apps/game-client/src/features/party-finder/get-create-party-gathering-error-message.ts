import axios from "axios";
import i18n from "@/i18n/config";

type CreatePartyGatheringErrorResponse = {
  message?: string;
};

const DEFAULT_CREATE_PARTY_GATHERING_ERROR_MESSAGE = i18n.t(
  "settings.partyFinder.errors.default",
);

export const getCreatePartyGatheringErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError<CreatePartyGatheringErrorResponse>(error)) {
    return DEFAULT_CREATE_PARTY_GATHERING_ERROR_MESSAGE;
  }

  const responseStatus = error.response?.status;

  if (responseStatus === 403) {
    return i18n.t("settings.partyFinder.errors.forbidden");
  }

  if (responseStatus === 429) {
    return i18n.t("settings.partyFinder.errors.rateLimit");
  }

  if (responseStatus === 400) {
    return (
      error.response?.data?.message ||
      i18n.t("settings.partyFinder.errors.invalidData")
    );
  }

  return DEFAULT_CREATE_PARTY_GATHERING_ERROR_MESSAGE;
};
