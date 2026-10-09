import {
  LootItemResponseDtoRarity,
  type LootItemResponseDto,
  type LootNpcResponseDto,
  type LootCommentResponseDto,
  type LootResponseDto,
} from "@lootlog/client/main";
import type { LootSnapshot } from "@lootlog/protocol/loot-summary";

export type Loot = LootResponseDto;

export type Item = LootItemResponseDto;

export type LootNpc = LootNpcResponseDto;

export type LootComment = LootCommentResponseDto;

export type ItemRarity = NonNullable<LootItemResponseDtoRarity> | "COMMON";

export const ItemRarity = {
  ...LootItemResponseDtoRarity,
  COMMON: "COMMON",
} as const satisfies Record<ItemRarity, ItemRarity>;

/** A realtime snapshot carries the HTTP response; only its arrays are readonly. */
export const lootFromSnapshot = (snapshot: LootSnapshot): Loot => ({
  ...snapshot,
  items: snapshot.items.map((item) => ({ ...item, prof: [...item.prof] })),
  players: [...snapshot.players],
  mapPlayersSnapshot: snapshot.mapPlayersSnapshot && [
    ...snapshot.mapPlayersSnapshot,
  ],
  npcs: [...snapshot.npcs],
  lootShare: Object.fromEntries(
    Object.entries(snapshot.lootShare).map(([key, players]) => [
      key,
      [...players],
    ]),
  ),
  submissions: snapshot.submissions && [...snapshot.submissions],
});
