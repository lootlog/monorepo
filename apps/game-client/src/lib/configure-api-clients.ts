import { gameClientFetch } from "./game-client-platform";
import { configureApiClients } from "@lootlog/client/transport";
import { API_URL, AUTH_API_URL, BATTLELOG_API_URL } from "@/config/api";

export const GAME_API_REQUEST_TIMEOUT_MS = 8_000;

export const configureGameApiClients = (): (() => void) => {
  const sharedConfiguration = {
    credentials: "include" as const,
    fetch: gameClientFetch,
    timeoutMs: GAME_API_REQUEST_TIMEOUT_MS,
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
