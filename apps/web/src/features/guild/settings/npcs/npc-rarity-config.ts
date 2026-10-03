import type { LootlogConfigNpcResponseDtoOutputAllowedRaritiesItem as LootlogConfigNpcAllowedRarity } from "@lootlog/client/main";
import { Crown, Sparkles, Swords, type LucideIcon } from "lucide-react";
import { LOOT_RARITY_TEXT_CLASS } from "@/features/guild/loots-list/loot-rarity-colors";

export const NPC_RARITY_CONFIG = [
  {
    key: "LEGENDARY",
    color: LOOT_RARITY_TEXT_CLASS.LEGENDARY,
    bgColor: "bg-orange-600/10",
    icon: Crown,
  },
  {
    key: "HEROIC",
    color: LOOT_RARITY_TEXT_CLASS.HEROIC,
    bgColor: "bg-blue-500/10",
    icon: Swords,
  },
  {
    key: "UNIQUE",
    color: LOOT_RARITY_TEXT_CLASS.UNIQUE,
    bgColor: "bg-amber-300/10",
    icon: Sparkles,
  },
] satisfies {
  key: LootlogConfigNpcAllowedRarity;
  color: string;
  bgColor: string;
  icon: LucideIcon;
}[];
