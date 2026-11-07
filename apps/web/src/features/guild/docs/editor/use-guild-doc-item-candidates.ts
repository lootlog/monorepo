import { useLootItemByHid } from "@/hooks/api/use-loot-item-by-hid";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useCatalogControllerGetItems } from "@lootlog/client/catalog";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";
import {
  lootItemToGuildDocSnapshot,
  type GuildDocItem,
  type GuildDocItemSnapshot,
} from "./guild-doc-item-node";

const SEARCH_MIN_LENGTH = 2;

const SEARCH_LIMIT = 8;

export type ItemCandidate = {
  key: string;
  item: GuildDocItemSnapshot;
  lvl: number;
};

/**
 * The items the dialog offers: the one being changed, the loot that recorded
 * the pasted identifier, and catalog hits for the typed name.
 */
export const useGuildDocItemCandidates = ({
  initialItem,
  itemHid,
  search,
}: {
  initialItem: GuildDocItem | null;
  itemHid: { hid: string; world: string } | null;
  search: string;
}) => {
  const debouncedSearch = useDebounce(search.trim(), 250);
  const searching = debouncedSearch.length >= SEARCH_MIN_LENGTH;
  const lootItem = useLootItemByHid(useGuildId(), itemHid).data;

  const catalogQuery = useCatalogControllerGetItems(
    { search: debouncedSearch, gameVersion: "pl", limit: SEARCH_LIMIT },
    { query: { enabled: searching } },
  );

  const current: ItemCandidate | null = initialItem?.snapshot
    ? { key: "current", item: initialItem.snapshot, lvl: 0 }
    : null;

  const loot: ItemCandidate | null = lootItem
    ? {
        key: `loot-${lootItem.hid}`,
        item: lootItemToGuildDocSnapshot(lootItem),
        lvl: lootItem.lvl,
      }
    : null;

  const catalog: ItemCandidate[] = searching
    ? (catalogQuery.data?.hits ?? []).map((hit) => ({
        key: `catalog-${hit.id}`,
        item: {
          name: hit.name,
          icon: hit.icon,
          stat: hit.stat,
          rarity: hit.rarity,
          type: hit.type,
          catalogId: hit.id,
        },
        lvl: hit.lvl,
      }))
    : [];

  return {
    current,
    loot,
    catalog,
    catalogError: catalogQuery.isError,
    showEmpty:
      searching && catalogQuery.isSuccess && catalog.length === 0 && !loot,
  };
};
