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

export const lootShareFromEvent = (
  lootShare: Readonly<Record<string, readonly string[]>>,
): Loot["lootShare"] =>
  Object.fromEntries(
    Object.entries(lootShare).map(([key, players]) => [key, [...players]]),
  );

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
  standingDraws: snapshot.standingDraws ? [...snapshot.standingDraws] : [],
});
