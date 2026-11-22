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

const SOCKET_ITEM_IDS = SYMBOL_TIERS.flatMap((tier) => [
  ...Object.values(tier.components),
  ...SOCKET_BONUSES.map((bonus) => tier.symbols[bonus]),
  ...tierChests(tier).map(({ id }) => id),
]);

export const socketItemsQuery = {
  ids: SOCKET_ITEM_IDS,
  gameVersion: WIKI_GAME_VERSION,
  limit: SOCKET_ITEM_IDS.length,
} satisfies CatalogControllerGetItemsParams;

export const useSocketCatalog = (enabled = true) => {
  const { data } = useCatalogControllerGetItems(socketItemsQuery, {
    query: { enabled },
  });

  return { items: data?.hits, isLoaded: data !== undefined };
};

export const useSocketItems = () => {
  const { items = [] } = useSocketCatalog();

  return new Map(items.map((item) => [item.id, item]));
};

type SocketedItem = { stat: string; lvl: number; type: string | null };

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

export const useSocketOptions = (item: SocketedItem) => {
  const { items = [], isLoaded } = useSocketCatalog();

  return { options: socketOptions(item, items), isLoaded };
};
