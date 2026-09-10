import {
  type ApiError,
  type ApiRequestContext,
  configureApiClients,
} from "@lootlog/client/transport";
import {
  ACTIVITY_API_URL,
  API_URL,
  AUTH_API_URL,
  BATTLELOG_API_URL,
  SEARCH_API_URL,
} from "@/config/api";
import { useAuthRecoveryStore } from "@/store/auth-recovery.store";

import { requiresReauthentication } from "@/lib/api-reauthentication";

export const handleWebApiError = (
  error: ApiError<unknown>,
  context: ApiRequestContext,
): void => {
  const isPublicEndpoint = new URL(
    context.url,
    window.location.origin,
  ).pathname.includes("/public/");

  if (
    !isPublicEndpoint &&
    (error.status === 401 || requiresReauthentication(error))
  ) {
    useAuthRecoveryStore.getState().requireRecovery({
      requiresReauth: requiresReauthentication(error),
      status: error.status,
    });
  }
};

export const configureWebApiClients = (): (() => void) => {
  const mainBaseUrl = API_URL ?? window.location.origin;

  const sharedConfiguration = {
    credentials: "include" as const,
    onError: handleWebApiError,
  };

  return configureApiClients({
    activity: {
      ...sharedConfiguration,
      baseUrl: ACTIVITY_API_URL ?? mainBaseUrl,
    },
    auth: {
      ...sharedConfiguration,
      baseUrl: AUTH_API_URL ?? mainBaseUrl,
    },
    battlelog: {
      ...sharedConfiguration,
      baseUrl: BATTLELOG_API_URL ?? mainBaseUrl,
    },
    main: {
      ...sharedConfiguration,
      baseUrl: mainBaseUrl,
    },
    search: {
      ...sharedConfiguration,
      baseUrl: SEARCH_API_URL ?? mainBaseUrl,
    },
  });
};
