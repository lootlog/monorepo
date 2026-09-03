import { configureApiClients } from "@lootlog/client/transport";
import { API_URL, AUTH_API_URL, BATTLELOG_API_URL } from "@/config/api";

export const configureGameApiClients = (): (() => void) => {
  const sharedConfiguration = {
    credentials: "include" as const,
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
