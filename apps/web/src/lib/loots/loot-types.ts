import {
  LootItemResponseDtoRarity,
  type LootItemResponseDto,
  type LootNpcResponseDto,
  type LootCommentResponseDto,
  type LootResponseDto,
} from "@lootlog/client/main";

export type Loot = LootResponseDto;

export type Item = LootItemResponseDto;

export type LootNpc = LootNpcResponseDto;

export type LootComment = LootCommentResponseDto;

export type ItemRarity = NonNullable<LootItemResponseDtoRarity> | "COMMON";

export const ItemRarity = {
  ...LootItemResponseDtoRarity,
  COMMON: "COMMON",
} as const satisfies Record<ItemRarity, ItemRarity>;
