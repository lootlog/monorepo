type ApiErrorWithMessage = {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
};

const getFirstApiMessage = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object" || !("response" in error)) {
    return undefined;
  }

  const rawMessage = (error as ApiErrorWithMessage).response?.data?.message;
  const normalizedMessage = Array.isArray(rawMessage)
    ? rawMessage[0]
    : rawMessage;

  if (typeof normalizedMessage !== "string") {
    return undefined;
  }

  return normalizedMessage.trim().length > 0 ? normalizedMessage : undefined;
};

export const getApiErrorMessage = (error: unknown): string | undefined => {
  const apiMessage = getFirstApiMessage(error);
  if (apiMessage) {
    return apiMessage;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return undefined;
};
