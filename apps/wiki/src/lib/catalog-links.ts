import { catalogPageSegment } from "@lootlog/domain/catalog-slug";
import type {
  ItemUpgrade,
  UpgradeBonusKey,
  UpgradeLevel,
} from "@lootlog/domain/item-upgrade";
import type { SocketBonus } from "@lootlog/domain/item-socket";

/** The wiki covers the Polish edition of Margonem for now. */
export const WIKI_GAME_VERSION = "pl";

/**
 * The id and the name slug of a page's URL segment. Old item links carry the
 * id alone, so the slug may be empty.
 */
export const readPageSegment = (segment: string) => {
  const match = /^(\d+)(?:-(.*))?$/.exec(segment);
  const id = Number(match?.[1]);

  return Number.isSafeInteger(id) ? { id, slug: match?.[2] ?? "" } : undefined;
};

export const itemPageParams = (item: { id: number; name: string }) => ({
  itemSlug: catalogPageSegment(item),
});

/**
 * The upgrade and socket symbol an item page shows the item with, and the
 * character level an elastic one is previewed at, so a link keeps them.
 */
export type ItemPageSearch = {
  upgrade?: UpgradeLevel;
  bonus?: UpgradeBonusKey;
  symbol?: SocketBonus;
  level?: number;
};

export const itemPageSearch = ({
  level,
  bonus,
  symbol,
}: ItemUpgrade): ItemPageSearch => {
  const search: ItemPageSearch = {};

  if (level > 0) {
    search.upgrade = level;
    search.bonus = bonus;
  }

  if (symbol) search.symbol = symbol;

  return search;
};

export const npcPageParams = (npc: { id: number; name: string }) => ({
  npcSlug: catalogPageSegment(npc),
});

// Catalog keys, such as `pl_template_257636_2`, address the old NPC links.
const CATALOG_KEY = /^[a-z]{2}(?:_[a-z]+)?_\d+_\d+$/;

export const isNpcCatalogKey = (segment: string) => CATALOG_KEY.test(segment);
