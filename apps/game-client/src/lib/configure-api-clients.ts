import { gameClientFetch } from "./game-client-platform";
import {
  type ApiError,
  configureApiClients,
  requiresReauthentication,
} from "@lootlog/client/transport";
import { API_URL, AUTH_API_URL, BATTLELOG_API_URL } from "@/config/api";
import { requireReauthentication } from "@/store/reauthentication.store";

export const configureGameApiClients = (): (() => void) => {
  const sharedConfiguration = {
    credentials: "include" as const,
    fetch: gameClientFetch,
    onError: (error: ApiError) => {
      if (requiresReauthentication(error)) requireReauthentication(error);
    },
  };

  return configureApiClients({
    auth: {
      ...sharedConfiguration,
      baseUrl: AUTH_API_URL,
    },
    battlelog: {
      ...sharedConfiguration,
      baseUrl: BATTLELOG_API_URL,
    },
    main: {
      ...sharedConfiguration,
      baseUrl: API_URL,
    },
  });
};
