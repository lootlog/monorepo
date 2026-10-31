import type { ReactNode } from "react";
import { ItemComparisonContext } from "@/contexts/item-comparison-context";
import { useSharedStoredState } from "@/hooks/use-shared-stored-state";
import {
  type ComparedItem,
  decodeItemComparison,
  encodeItemComparison,
  ITEM_COMPARISON_PARAM,
  MAX_COMPARED_ITEMS,
} from "@/lib/item-comparison";

const NO_ITEMS: ReadonlyArray<ComparedItem> = [];

const STORED_COMPARISON = {
  storageKey: "lootlog-wiki-item-comparison",
  params: [ITEM_COMPARISON_PARAM],
  encode: encodeItemComparison,
  decode: decodeItemComparison,
  empty: NO_ITEMS,
};

/** The items the player compares, kept across visits and shared as a link. */
export function ItemComparisonProvider({ children }: { children: ReactNode }) {
  const [items, update] = useSharedStoredState(STORED_COMPARISON);

  return (
    <ItemComparisonContext
      value={{
        items,
        add: (id, upgrade) =>
          update((current) =>
            current.length >= MAX_COMPARED_ITEMS ||
            current.some((item) => item.id === id)
              ? current
              : [...current, { id, upgrade }],
          ),
        remove: (id) =>
          update((current) => current.filter((item) => item.id !== id)),
        setUpgrade: (id, upgrade) =>
          update((current) =>
            current.map((item) =>
              item.id === id ? { ...item, upgrade } : item,
            ),
          ),
        clear: () => update(() => NO_ITEMS),
      }}
    >
      {children}
    </ItemComparisonContext>
  );
}
