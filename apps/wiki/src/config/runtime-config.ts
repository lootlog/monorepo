import { createServerFn } from "@tanstack/react-start";

export type RuntimeConfig = {
  apiUrl: string;
  authServiceUrl: string;
  searchApiUrl: string;
  /** The Web app, which owns account settings and serves theme wallpapers. */
  webAppUrl: string;
};

const readRequiredVariable = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} must be configured.`);
  }

  return value;
};

export const getRuntimeConfig = createServerFn({ method: "GET" }).handler(
  (): RuntimeConfig => ({
    apiUrl: readRequiredVariable("VITE_API_URL"),
    authServiceUrl: readRequiredVariable("VITE_AUTH_SERVICE_URL"),
    searchApiUrl: readRequiredVariable("VITE_SEARCH_API_URL"),
    webAppUrl: readRequiredVariable("VITE_WEB_APP_URL"),
  }),
);
