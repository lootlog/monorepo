import { ApiError, requiresReauthentication } from "@lootlog/client/transport";

export const isReauthenticationError = (error: Error | null): boolean =>
  error instanceof ApiError &&
  (error.status === 401 || requiresReauthentication(error));
