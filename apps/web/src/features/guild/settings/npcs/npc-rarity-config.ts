import type { LootlogConfigNpcResponseDtoOutputAllowedRaritiesItem as LootlogConfigNpcAllowedRarity } from "@lootlog/client/main";
import { Crown, Sparkles, Swords, type LucideIcon } from "lucide-react";
import {
  LOOT_RARITY_SURFACE_CLASS,
  LOOT_RARITY_TEXT_CLASS,
} from "@lootlog/ui/lib/item-rarity-colors";

export const NPC_RARITY_CONFIG = [
  {
    key: "LEGENDARY",
    color: LOOT_RARITY_TEXT_CLASS.LEGENDARY,
    bgColor: LOOT_RARITY_SURFACE_CLASS.LEGENDARY,
    icon: Crown,
  },
  {
    key: "HEROIC",
    color: LOOT_RARITY_TEXT_CLASS.HEROIC,
    bgColor: LOOT_RARITY_SURFACE_CLASS.HEROIC,
    icon: Swords,
  },
  {
    key: "UNIQUE",
    color: LOOT_RARITY_TEXT_CLASS.UNIQUE,
    bgColor: LOOT_RARITY_SURFACE_CLASS.UNIQUE,
    icon: Sparkles,
  },
] satisfies {
  key: LootlogConfigNpcAllowedRarity;
  color: string;
  bgColor: string;
  icon: LucideIcon;
}[];
