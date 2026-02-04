import { useQueryState, parseAsInteger } from "nuqs";

export const useSelectedLoot = () => {
  const [selectedLootId, setSelectedLootId] = useQueryState(
    "lootId",
    parseAsInteger,
  );

  const openLootDetails = (lootId: number) => {
    setSelectedLootId(lootId);
  };

  const closeLootDetails = () => {
    setSelectedLootId(null);
  };

  return {
    selectedLootId,
    openLootDetails,
    closeLootDetails,
    isOpen: selectedLootId !== null,
  };
};
