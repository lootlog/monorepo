import {
  canWearLootDrawItem,
  lootDrawWinnerTickets,
} from "@lootlog/domain/loot-draw";
import type { CreateLootDrawRequest } from "#src/contracts/loots/schemas";
import type { LootDrawEntrantRecord } from "#src/database/drizzle/schema";
import { ErrorKey } from "#src/loots/error-key";
import type { LootQueryResult } from "#src/loots/query/loot-query-result";

type LootDrawLoot = Pick<LootQueryResult, "items" | "players" | "lootShare">;

export type LootDrawEntrantsResult =
  | { readonly entrants: LootDrawEntrantRecord[] }
  | { readonly error: ErrorKey };

const playerKey = (player: { characterId: number | null; name: string }) =>
  player.characterId !== null && player.characterId > 0
    ? `character:${player.characterId}`
    : `name:${player.name.trim().toLowerCase()}`;

/**
 * The entrants of a draw for one of the loot's items: the party member who
 * caught it first, then the outsiders in the order the request lists them.
 * Every outsider must be outside the party, listed once and able to wear the
 * item; the winner's tickets come from the whole party.
 */
export const buildLootDrawEntrants = (
  loot: LootDrawLoot,
  request: CreateLootDrawRequest,
): LootDrawEntrantsResult => {
  const item = loot.items.find(({ hid }) => hid === request.itemHid);

  if (!item) return { error: ErrorKey.LOOT_DRAW_ITEM_NOT_FOUND };

  const winnerId = Object.entries(loot.lootShare).find(([, hids]) =>
    hids.includes(item.hid),
  )?.[0];

  const winner = loot.players.find(({ id }) => id === winnerId);

  if (!winner) return { error: ErrorKey.LOOT_DRAW_ITEM_UNASSIGNED };

  const partyKeys = new Set(
    loot.players.flatMap((player) => [
      playerKey(player),
      playerKey({ characterId: null, name: player.name }),
    ]),
  );

  const outsiderKeys = new Set<string>();

  for (const outsider of request.outsiders) {
    const keys = [
      playerKey(outsider),
      playerKey({ characterId: null, name: outsider.name }),
    ];

    if (keys.some((key) => partyKeys.has(key))) {
      return { error: ErrorKey.LOOT_DRAW_OUTSIDER_IN_PARTY };
    }

    if (keys.some((key) => outsiderKeys.has(key))) {
      return { error: ErrorKey.LOOT_DRAW_DUPLICATE_OUTSIDER };
    }

    if (!canWearLootDrawItem(item, outsider)) {
      return { error: ErrorKey.LOOT_DRAW_OUTSIDER_INELIGIBLE };
    }

    for (const key of keys) outsiderKeys.add(key);
  }

  return {
    entrants: [
      {
        name: winner.name,
        accountId: winner.accountId,
        characterId: winner.characterId,
        prof: winner.prof,
        lvl: winner.lvl,
        icon: winner.icon,
        source: "WINNER",
        tickets: lootDrawWinnerTickets(item, loot.players),
      },
      ...request.outsiders.map((outsider) => ({
        name: outsider.name.trim(),
        accountId: outsider.accountId,
        characterId: outsider.characterId,
        prof: outsider.prof,
        lvl: outsider.lvl,
        icon: outsider.icon,
        source: outsider.source,
        tickets: 1,
      })),
    ],
  };
};
