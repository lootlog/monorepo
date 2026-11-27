import type { BingoBoardDetailResponseDtoTilesItemCondition } from "@lootlog/client/main";
import { BingoTileConditionKind } from "@lootlog/schema/bingo";
import { ItemRarityEnum } from "@lootlog/schema/item-rarity";
import { NpcTypeEnum } from "@lootlog/schema/npc-type";
import {
  Hand,
  Radar,
  Skull,
  Sparkles,
  Swords,
  type LucideIcon,
} from "lucide-react";

type BingoConditionKindDefinition = {
  readonly icon: LucideIcon;
  readonly defaultCondition: (
    targetCount: number,
  ) => BingoBoardDetailResponseDtoTilesItemCondition;
};

export const BINGO_CONDITION_KINDS = {
  LOOT: {
    icon: Sparkles,
    defaultCondition: (targetCount) => ({
      kind: "LOOT",
      targetCount,
      rarities: [ItemRarityEnum.LEGENDARY],
      npcTypes: [NpcTypeEnum.ELITE2],
    }),
  },
  KILL: {
    icon: Skull,
    defaultCondition: (targetCount) => ({
      kind: "KILL",
      targetCount,
      npcTypes: [NpcTypeEnum.COLOSSUS],
    }),
  },
  HERO_SIGHTING: {
    icon: Radar,
    defaultCondition: (targetCount) => ({
      kind: "HERO_SIGHTING",
      targetCount,
      includeManual: false,
    }),
  },
  BATTLE: {
    icon: Swords,
    defaultCondition: (targetCount) => ({
      kind: "BATTLE",
      targetCount,
      metric: "WIN_STREAK",
      matchmakingOnly: true,
      battleTypes: [],
      excludeFlee: true,
    }),
  },
  MANUAL: {
    icon: Hand,
    defaultCondition: (targetCount) => ({ kind: "MANUAL", targetCount }),
  },
} satisfies Record<BingoTileConditionKind, BingoConditionKindDefinition>;

export const BINGO_CONDITION_KIND_ORDER = Object.values(BingoTileConditionKind);
