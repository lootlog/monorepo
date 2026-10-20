export const LOOTLOG_APP_URL = import.meta.env.VITE_LOOTLOG_APP_URL;

export const COMMIT_SHA = import.meta.env.VITE_COMMIT_SHA;

export const GAME_CLIENT_PACKAGE_VERSION = import.meta.env
  .VITE_GAME_CLIENT_PACKAGE_VERSION;

export const BUILD_TIMESTAMP = import.meta.env.VITE_BUILD_TIMESTAMP;

export const APP_ENVIRONMENT = import.meta.env.MODE;

export const IS_DEV = import.meta.env.MODE === "development";

/** Faction war art lives with the Web app; the sandbox serves its own copy. */
export const FACTION_WAR_ASSETS_URL =
  import.meta.env.VITE_FACTION_WAR_ASSETS_URL ||
  `${import.meta.env.VITE_LOOTLOG_APP_URL}/faction-wars`;
