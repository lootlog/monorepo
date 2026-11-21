import {
  type CatalogControllerGetItemsParams,
  useCatalogControllerGetItems,
} from "@lootlog/client/catalog";
import {
  SOCKET_BONUSES,
  socketOptions,
  SYMBOL_TIERS,
  tierChests,
} from "@lootlog/domain/item-socket";
import type { ItemUpgrade } from "@lootlog/domain/item-upgrade";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";

// Every component, symbol and chest, which one request fetches for every
// page.
const SOCKET_ITEM_IDS = SYMBOL_TIERS.flatMap((tier) => [
  ...Object.values(tier.components),
  ...SOCKET_BONUSES.map((bonus) => tier.symbols[bonus]),
  ...tierChests(tier).map(({ id }) => id),
]);

/** The catalog request for every component, symbol and chest. */
export const socketItemsQuery = {
  ids: SOCKET_ITEM_IDS,
  gameVersion: WIKI_GAME_VERSION,
  limit: SOCKET_ITEM_IDS.length,
} satisfies CatalogControllerGetItemsParams;

/** Components, symbols and chests as the catalog has them, once loaded. */
export const useSocketCatalog = (enabled = true) => {
  const { data } = useCatalogControllerGetItems(socketItemsQuery, {
    query: { enabled },
  });

  return { items: data?.hits, isLoaded: data !== undefined };
};

/** Components, symbols and chests by id, as far as the catalog has loaded them. */
export const useSocketItems = () => {
  const { items = [] } = useSocketCatalog();

  return new Map(items.map((item) => [item.id, item]));
};

type SocketedItem = { stat: string; lvl: number; type: string | null };

/**
 * The upgrade with its symbol only while the item's socket takes it, as far
 * as the catalog's symbols are known: until they load, the symbol stays.
 */
export const keepFittingSymbol = (
  item: SocketedItem,
  upgrade: ItemUpgrade,
  symbols: readonly { id: number; stat: string }[] | undefined,
): ItemUpgrade =>
  upgrade.symbol === undefined ||
  symbols === undefined ||
  socketOptions(item, symbols).some(({ bonus }) => bonus === upgrade.symbol)
    ? upgrade
    : { ...upgrade, symbol: undefined };

/**
 * The symbols the item's socket takes, by the catalog's symbols, and
 * whether those have loaded.
 */
export const useSocketOptions = (item: SocketedItem) => {
  const { items = [], isLoaded } = useSocketCatalog();

  return { options: socketOptions(item, items), isLoaded };
};

/** The upgrade with a symbol the item's socket does not take left out. */
export const useFittingUpgrade = (
  item: SocketedItem,
  upgrade: ItemUpgrade,
): ItemUpgrade => {
  const { items } = useSocketCatalog(upgrade.symbol !== undefined);

  return keepFittingSymbol(item, upgrade, items);
};
