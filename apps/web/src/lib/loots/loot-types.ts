import {
  LootResponseDtoItemsItemRarity,
  LootResponseDtoSource,
  type LootCommentResponseDto,
  type LootResponseDto,
  type LootResponseDtoItemsItem,
  type LootResponseDtoNpcsItem,
  type LootResponseDtoPlayersItem,
  type LootShareResponseDto,
} from "@/lib/api/generated/main/model";

export type Loot = LootResponseDto;
export type Item = LootResponseDtoItemsItem;
export type LootNpc = LootResponseDtoNpcsItem;
export type LootPlayer = LootResponseDtoPlayersItem;
export type LootComment = LootCommentResponseDto;
export type LootShare = LootShareResponseDto;
export type ItemRarity = NonNullable<LootResponseDtoItemsItemRarity>;
export type LootSource = LootResponseDtoSource;

export const ItemRarity = LootResponseDtoItemsItemRarity;
export const LootSource = LootResponseDtoSource;
