import { useLoadedWornItems } from "@/hooks/use-worn-items";
import { sumItemStats } from "@/lib/item-stat-totals";

/**
 * The set as worn and its stats added up. A change counts as the User's once
 * the set has loaded: loading it shows its stats, not a gain.
 */
export const useSetSummary = () => {
  const { wornItems, isLoaded } = useLoadedWornItems();

  return {
    wornItems,
    totals: sumItemStats([...wornItems.values()].map(({ item }) => item.stat)),
    isLoaded,
  };
};
