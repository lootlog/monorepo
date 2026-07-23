export const LOOTLOG_APP_URL = import.meta.env.VITE_LOOTLOG_APP_URL as string;
export const COMMIT_SHA = import.meta.env.VITE_COMMIT_SHA as string;
export const GAME_CLIENT_PACKAGE_VERSION = import.meta.env
  .VITE_GAME_CLIENT_PACKAGE_VERSION as string;
export const BUILD_TIMESTAMP = import.meta.env.VITE_BUILD_TIMESTAMP as string;
export const APP_ENVIRONMENT = import.meta.env.MODE;
export const IS_DEV = import.meta.env.MODE === "development";
