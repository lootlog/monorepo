export const BETTER_AUTH_INTERNAL_PATH = "/idp";

export const resolveBetterAuthBaseURL = (appUrl: string): string => {
  const baseURL = new URL(appUrl);
  baseURL.pathname = `${baseURL.pathname.replace(/\/+$/u, "")}${BETTER_AUTH_INTERNAL_PATH}`;
  baseURL.search = "";
  baseURL.hash = "";
  return baseURL.toString();
};
