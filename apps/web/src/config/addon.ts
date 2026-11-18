import { docsPageUrl } from "@lootlog/domain/public-sites";

export const ADDON_INSTALL_URL = import.meta.env.VITE_ADDON_INSTALL_URL;

export const BATTLELOG_PUBLIC_URL = import.meta.env.VITE_BATTLELOG_PUBLIC_URL;

export const ADDON_INSTALLATION_DOCS_URL = docsPageUrl("installation");

export const GETTING_STARTED_DOCS_URL = docsPageUrl("getting-started");

export const TAMPERMONKEY_URL = "https://www.tampermonkey.net/";
