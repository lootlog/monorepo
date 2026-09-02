import { LootItemResponseDtoRarity } from "@lootlog/client/main";
import type { LootItemResponseDto } from "@lootlog/client/main";
import type { LootNpcResponseDto } from "@lootlog/client/main";
import type { LootPlayerResponseDto } from "@lootlog/client/main";
import { LootResponseDtoSource } from "@lootlog/client/main";
import type { LootCommentResponseDto } from "@lootlog/client/main";
import type { LootResponseDto } from "@lootlog/client/main";
import type { LootShareResponseDto } from "@lootlog/client/main";

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
