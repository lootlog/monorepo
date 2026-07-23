import { LootItemResponseDtoRarity } from "@lootlog/api-client/models/main/loot-item-response-dto-rarity";
import type { LootItemResponseDto } from "@lootlog/api-client/models/main/loot-item-response-dto";
import type { LootNpcResponseDto } from "@lootlog/api-client/models/main/loot-npc-response-dto";
import type { LootPlayerResponseDto } from "@lootlog/api-client/models/main/loot-player-response-dto";
import { LootResponseDtoSource } from "@lootlog/api-client/models/main/loot-response-dto-source";
import type { LootCommentResponseDto } from "@lootlog/api-client/models/main/loot-comment-response-dto";
import type { LootResponseDto } from "@lootlog/api-client/models/main/loot-response-dto";
import type { LootShareResponseDto } from "@lootlog/api-client/models/main/loot-share-response-dto";

export type Loot = LootResponseDto;
export type Item = LootItemResponseDto;
export type LootNpc = LootNpcResponseDto;
export type LootPlayer = LootPlayerResponseDto;
export type LootComment = LootCommentResponseDto;
export type LootShare = LootShareResponseDto;
export type ItemRarity = NonNullable<LootItemResponseDtoRarity> | "COMMON";
export type LootSource = LootResponseDtoSource;

export const ItemRarity = {
  ...LootItemResponseDtoRarity,
  COMMON: "COMMON",
} as const satisfies Record<ItemRarity, ItemRarity>;
export const LootSource = LootResponseDtoSource;
