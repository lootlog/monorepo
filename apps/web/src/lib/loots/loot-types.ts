import {
  LootItemResponseDtoRarity,
  type LootItemResponseDto,
  type LootNpcResponseDto,
  type LootPlayerResponseDto,
  LootResponseDtoSource,
  type LootCommentResponseDto,
  type LootResponseDto,
  type LootShareResponseDto,
} from "@/lib/api/generated/main/model";

export type Loot = LootResponseDto;
export type Item = LootItemResponseDto;
export type LootNpc = LootNpcResponseDto;
export type LootPlayer = LootPlayerResponseDto;
export type LootComment = LootCommentResponseDto;
export type LootShare = LootShareResponseDto;
export type ItemRarity = NonNullable<LootItemResponseDtoRarity>;
export type LootSource = LootResponseDtoSource;

export const ItemRarity = LootItemResponseDtoRarity;
export const LootSource = LootResponseDtoSource;
