import { createServerFn } from "@tanstack/react-start";

export type RuntimeConfig = {
  apiUrl: string;
  authServiceUrl: string;
  /** The Web app, which owns account settings and serves theme wallpapers. */
  webAppUrl: string;
  /**
   * The catalog behind the edge's sign-in check, for what the browser does
   * as its User, such as reporting a page. Reads go through `/api/catalog`.
   */
  catalogApiUrl: string;
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
    webAppUrl: readRequiredVariable("VITE_WEB_APP_URL"),
    catalogApiUrl: readRequiredVariable("CATALOG_API_URL"),
  }),
);
