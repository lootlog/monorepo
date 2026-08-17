import {
  type ApiError,
  type ApiRequestContext,
  configureApiClients,
} from "@lootlog/api-client/transport";
import { DISCORD_AUTH_SCOPES } from "@lootlog/types";
import {
  ACTIVITY_API_URL,
  API_URL,
  AUTH_API_URL,
  BATTLELOG_API_URL,
  SEARCH_API_URL,
} from "@/config/api";
import { authClient } from "@/lib/auth-client";

type ApiErrorData = {
  requiresReauth?: boolean;
};

let reauthenticationPromise: Promise<void> | null = null;

const requiresReauthentication = (error: ApiError<unknown>): boolean => {
  if (typeof error.data !== "object" || error.data === null) {
    return false;
  }

  return (error.data as ApiErrorData).requiresReauth === true;
};

const reauthenticate = (): Promise<void> => {
  if (reauthenticationPromise) {
    return reauthenticationPromise;
  }

  reauthenticationPromise = authClient.signIn
    .social({
      provider: "discord",
      callbackURL: window.location.href,
      scopes: DISCORD_AUTH_SCOPES,
    })
    .then(() => undefined)
    .catch((error) => {
      console.warn("Reauthentication failed:", error);
      throw error;
    })
    .finally(() => {
      reauthenticationPromise = null;
    });

  return reauthenticationPromise;
};

const handleError = (
  error: ApiError<unknown>,
  context: ApiRequestContext,
): void => {
  const isPublicEndpoint = new URL(context.url).pathname.includes("/public/");
  if (
    !isPublicEndpoint &&
    (error.status === 401 || requiresReauthentication(error))
  ) {
    void reauthenticate();
  }
};

export const configureWebApiClients = (): (() => void) => {
  const mainBaseUrl = API_URL ?? window.location.origin;
  const sharedConfiguration = {
    credentials: "include" as const,
    onError: handleError,
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
