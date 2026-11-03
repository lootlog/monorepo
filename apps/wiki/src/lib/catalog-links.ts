import { catalogPageSegment } from "@lootlog/domain/catalog-slug";
import type {
  ItemUpgrade,
  UpgradeBonusKey,
  UpgradeLevel,
} from "@lootlog/domain/item-upgrade";

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

/** The upgrade an item page shows the item at, so a link keeps it. */
export type ItemPageSearch = {
  upgrade?: UpgradeLevel;
  bonus?: UpgradeBonusKey;
};

export const itemPageSearch = ({
  level,
  bonus,
}: ItemUpgrade): ItemPageSearch =>
  level === 0 ? {} : { upgrade: level, bonus };

export const npcPageParams = (npc: { id: number; name: string }) => ({
  npcSlug: catalogPageSegment(npc),
});

// Catalog keys, such as `pl_template_257636_2`, address the old NPC links.
const CATALOG_KEY = /^[a-z]{2}(?:_[a-z]+)?_\d+_\d+$/;

export const isNpcCatalogKey = (segment: string) => CATALOG_KEY.test(segment);
