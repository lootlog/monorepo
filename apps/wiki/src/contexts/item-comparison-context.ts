import { createContext, useContext } from "react";
import type { ComparedItem } from "@/lib/item-comparison";
import type { ItemUpgrade } from "@/lib/item-upgrade";

type ItemComparisonContextValue = {
  items: ReadonlyArray<ComparedItem>;
  /** Adds the item at `upgrade`; a full comparison or a listed item stays. */
  add: (id: number, upgrade: ItemUpgrade) => void;
  remove: (id: number) => void;
  setUpgrade: (id: number, upgrade: ItemUpgrade) => void;
  clear: () => void;
};

export const ItemComparisonContext =
  createContext<ItemComparisonContextValue | null>(null);

export const useItemComparison = () => {
  const value = useContext(ItemComparisonContext);

  if (!value) {
    throw new Error("useItemComparison must be used in ItemComparisonContext.");
  }

  return value;
};
