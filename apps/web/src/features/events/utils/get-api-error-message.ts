export const getApiErrorMessage = (error: unknown): string | undefined => {
  if (error && typeof error === "object" && "response" in error) {
    const responseError = error as {
      response?: {
        data?: {
          message?: string | string[];
        };
      };
    };
    const rawMessage = responseError.response?.data?.message;
    const normalizedMessage = Array.isArray(rawMessage)
      ? rawMessage[0]
      : rawMessage;

    if (
      typeof normalizedMessage === "string" &&
      normalizedMessage.trim().length > 0
    ) {
      return normalizedMessage;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return undefined;
};
