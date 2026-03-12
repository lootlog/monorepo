import axios from "axios";

type CreatePartyGatheringErrorResponse = {
  message?: string;
};

const DEFAULT_CREATE_PARTY_GATHERING_ERROR_MESSAGE =
  "Nie udało się utworzyć ogłoszenia";

export const getCreatePartyGatheringErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError<CreatePartyGatheringErrorResponse>(error)) {
    return DEFAULT_CREATE_PARTY_GATHERING_ERROR_MESSAGE;
  }

  const responseStatus = error.response?.status;

  if (responseStatus === 403) {
    return "Brak uprawnień do wysyłania ogłoszeń";
  }

  if (responseStatus === 429) {
    return "Zbyt wiele prób. Spróbuj za chwilę.";
  }

  if (responseStatus === 400) {
    return error.response?.data?.message || "Nieprawidłowe dane";
  }

  return DEFAULT_CREATE_PARTY_GATHERING_ERROR_MESSAGE;
};
