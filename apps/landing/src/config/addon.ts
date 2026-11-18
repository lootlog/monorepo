import { COMMUNITY_LINKS } from "@lootlog/domain/public-sites";

export const ADDON_URL =
  import.meta.env.VITE_ADDON_URL || COMMUNITY_LINKS.latestRelease;
