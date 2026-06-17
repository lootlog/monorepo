import type { LootlogConfigNpcResponseDtoOutputAllowedRaritiesItem as LootlogConfigNpcAllowedRarity } from "@/lib/api/generated/main/model";
import { Crown, Sparkles, Swords, type LucideIcon } from "lucide-react";

export const NPC_RARITY_CONFIG: {
  key: LootlogConfigNpcAllowedRarity;
  color: string;
  bgColor: string;
  icon: LucideIcon;
}[] = [
  {
    key: "LEGENDARY",
    color: "text-amber-700",
    bgColor: "bg-amber-700/10",
    icon: Crown,
  },
  {
    key: "HEROIC",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    icon: Swords,
  },
  {
    key: "UNIQUE",
    color: "text-amber-300",
    bgColor: "bg-amber-300/10",
    icon: Sparkles,
  },
];
