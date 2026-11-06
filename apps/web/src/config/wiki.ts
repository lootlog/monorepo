import { catalogPageSegment } from "@lootlog/domain/catalog-slug";

export const WIKI_URL = "https://wiki.lootlog.pl";

export const wikiItemUrl = (item: { id: number; name: string }) =>
  `${WIKI_URL}/items/${catalogPageSegment(item)}`;

export const wikiNpcUrl = (npc: { id: number; name: string }) =>
  `${WIKI_URL}/npcs/${catalogPageSegment(npc)}`;
