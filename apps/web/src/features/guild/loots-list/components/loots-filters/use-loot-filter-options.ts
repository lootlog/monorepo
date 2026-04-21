import { NpcType } from "@/lib/api/generated/main/model";
import { ItemRarity } from "@/lib/loots/loot-types";
import { useTranslation } from "react-i18next";

type LootQuickFilter = {
  id: string;
  label: string;
  category: string;
  filters: {
    rarities?: string[];
    npcTypes?: string[];
  };
  isDefault: true;
};

export function useLootFilterOptions() {
  const { t } = useTranslation();

  const rarityOptions = [
    { value: ItemRarity.LEGENDARY, label: t("itemRarity.LEGENDARY") },
    { value: ItemRarity.HEROIC, label: t("itemRarity.HEROIC") },
    { value: ItemRarity.UNIQUE, label: t("itemRarity.UNIQUE") },
  ];

  const npcTypeOptions = [
    { value: NpcType.NPC, label: t("npcType.NPC") },
    { value: NpcType.COLOSSUS, label: t("npcType.COLOSSUS") },
    { value: NpcType.TITAN, label: t("npcType.TITAN") },
    { value: NpcType.HERO, label: t("npcType.HERO") },
    { value: NpcType.EVENT_HERO, label: t("npcType.EVENT_HERO") },
    { value: NpcType.ELITE3, label: t("npcType.ELITE3") },
    { value: NpcType.ELITE2, label: t("npcType.ELITE2") },
    { value: NpcType.ELITE, label: t("npcType.ELITE") },
  ];

  const defaultQuickFilters: LootQuickFilter[] = [
    {
      id: "default-legendary",
      label: t("loots.filtersPanel.quickFilters.legendaryLabel"),
      category: t("loots.filtersPanel.quickFilters.itemCategory"),
      filters: {
        rarities: [ItemRarity.LEGENDARY],
      },
      isDefault: true,
    },
    {
      id: "default-titan",
      label: t("loots.filtersPanel.quickFilters.titanLabel"),
      category: t("loots.filtersPanel.quickFilters.npcCategory"),
      filters: {
        npcTypes: [NpcType.TITAN],
      },
      isDefault: true,
    },
    {
      id: "default-heros",
      label: t("loots.filtersPanel.quickFilters.heroLabel"),
      category: t("loots.filtersPanel.quickFilters.npcCategory"),
      filters: {
        npcTypes: [NpcType.HERO],
      },
      isDefault: true,
    },
  ];

  const compactNpcTypeOptions = npcTypeOptions.filter(
    (option) => option.value !== NpcType.EVENT_HERO,
  );

  return {
    defaultQuickFilters,
    compactNpcTypeOptions,
    labels: {
      players: t("loots.filtersPanel.playersLabel"),
      playersPlaceholder: t("loots.filtersPanel.playersPlaceholder"),
      npcs: t("loots.filtersPanel.npcsLabel"),
      npcsPlaceholder: t("loots.filtersPanel.npcsPlaceholder"),
      rarities: t("loots.filtersPanel.raritiesLabel"),
      raritiesPlaceholder: t("loots.filtersPanel.raritiesPlaceholder"),
      npcTypes: t("loots.filtersPanel.npcTypesLabel"),
      npcTypesPlaceholder: t("loots.filtersPanel.npcTypesPlaceholder"),
    },
    npcTypeOptions,
    rarityOptions,
  };
}
