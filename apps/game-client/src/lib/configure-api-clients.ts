import { configureApiClients } from "@lootlog/api-client/transport";
import { API_URL, AUTH_API_URL, BATTLELOG_API_URL } from "@/config/api";
import { applyDevPermissionOverrideHeader } from "@/lib/dev-permission-override";

const getHeaders = (): Headers => {
  const headers = new Headers();
  applyDevPermissionOverrideHeader(headers);
  return headers;
};

export const configureGameApiClients = (): (() => void) => {
  const sharedConfiguration = {
    credentials: "include" as const,
    getHeaders,
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
