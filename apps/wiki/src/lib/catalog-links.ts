import { catalogPageSegment } from "@lootlog/domain/catalog-slug";
import type {
  ItemUpgrade,
  UpgradeBonusKey,
  UpgradeLevel,
} from "@lootlog/domain/item-upgrade";
import type { SocketBonus } from "@lootlog/domain/item-socket";

export const WIKI_GAME_VERSION = "pl";

export const readPageSegment = (segment: string) => {
  const match = /^(\d+)(?:-(.*))?$/.exec(segment);
  const id = Number(match?.[1]);

  return Number.isSafeInteger(id) ? { id, slug: match?.[2] ?? "" } : undefined;
};

export const itemPageParams = (item: { id: number; name: string }) => ({
  itemSlug: catalogPageSegment(item),
});

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

const CATALOG_KEY = /^[a-z]{2}(?:_[a-z]+)?_\d+_\d+$/;

export const isNpcCatalogKey = (segment: string) => CATALOG_KEY.test(segment);
