import type {
  LootItemResponseDto,
  LootNpcResponseDto,
  LootCommentResponseDto,
  LootResponseDto,
} from "@lootlog/client/main";
import type { LootSnapshot } from "@lootlog/protocol/loot-summary";

export type Loot = LootResponseDto;

export type Item = LootItemResponseDto;

export type LootNpc = LootNpcResponseDto;

export type LootComment = LootCommentResponseDto;

/** A realtime loot share, as the HTTP response's mutable arrays. */
export const lootShareFromEvent = (
  lootShare: Readonly<Record<string, readonly string[]>>,
): Loot["lootShare"] =>
  Object.fromEntries(
    Object.entries(lootShare).map(([key, players]) => [key, [...players]]),
  );

/** A realtime snapshot carries the HTTP response; only its arrays are readonly. */
export const lootFromSnapshot = (snapshot: LootSnapshot): Loot => ({
  ...snapshot,
  items: snapshot.items.map((item) => ({ ...item, prof: [...item.prof] })),
  players: [...snapshot.players],
  mapPlayersSnapshot: snapshot.mapPlayersSnapshot && [
    ...snapshot.mapPlayersSnapshot,
  ],
  npcs: [...snapshot.npcs],
  lootShare: lootShareFromEvent(snapshot.lootShare),
  submissions: snapshot.submissions && [...snapshot.submissions],
  likes: snapshot.likes ? [...snapshot.likes] : [],
});
