import { catalogPageSegment } from "./catalog-slug.js";
import { PUBLIC_SITE_ORIGINS } from "./public-sites.js";

/** Wiki item and NPC pages, matching the wiki's `items_.$itemSlug` and `npcs_.$npcSlug` routes. */
export const wikiItemUrl = (item: { id: number; name: string }) =>
  `${PUBLIC_SITE_ORIGINS.wiki}/items/${catalogPageSegment(item)}`;

export const wikiNpcUrl = (npc: { id: number; name: string }) =>
  `${PUBLIC_SITE_ORIGINS.wiki}/npcs/${catalogPageSegment(npc)}`;
