import axios from "axios";
import { getFixedT } from "@/i18n/get-fixed-t";

type CreatePartyGatheringErrorResponse = {
  message?: string;
};

export const getCreatePartyGatheringErrorMessage = (error: unknown): string => {
  const t = getFixedT("partyFinder");
  const defaultMessage = t("errors.defaultCreate");

  if (!axios.isAxiosError<CreatePartyGatheringErrorResponse>(error)) {
    return defaultMessage;
  }

  const responseStatus = error.response?.status;

  if (responseStatus === 403) {
    return t("errors.forbidden");
  }

  if (responseStatus === 429) {
    return t("errors.tooManyRequests");
  }

  if (responseStatus === 400) {
    return error.response?.data?.message || t("errors.invalidData");
  }

  return defaultMessage;
};
