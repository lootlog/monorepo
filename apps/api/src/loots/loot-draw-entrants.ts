import {
  canWearLootDrawItem,
  findLootItemOwner,
  isLootDrawItem,
  isLootDrawTicketOrder,
} from "@lootlog/domain/loot-draw";
import type { CreateLootDrawRequest } from "#src/contracts/loots/schemas";
import type { LootDrawEntrantRecord } from "#src/database/drizzle/loot.schema";
import { ErrorKey } from "#src/loots/error-key";
import type { LootQueryResult } from "#src/loots/query/loot-query-result";

type LootDrawLoot = Pick<LootQueryResult, "items" | "players" | "lootShare">;

export type LootDrawEntrantsResult =
  | { readonly entrants: LootDrawEntrantRecord[] }
  | { readonly error: ErrorKey };

const nameKey = (name: string) => `name:${name.trim().toLowerCase()}`;

/** A character id when known, and the name either way: both identify a player. */
const playerKeys = (player: { characterId: number | null; name: string }) =>
  player.characterId !== null && player.characterId > 0
    ? [`character:${player.characterId}`, nameKey(player.name)]
    : [nameKey(player.name)];

/** The entrant as the loot records the party member it names. */
const fromPartyMember = (
  player: LootDrawLoot["players"][number],
  source: "WINNER" | "PARTY",
  tickets: number,
): LootDrawEntrantRecord => ({
  name: player.name,
  accountId: player.accountId,
  characterId: player.characterId,
  prof: player.prof,
  lvl: player.lvl,
  icon: player.icon,
  source,
  tickets,
});

/**
 * Checks a manager's draw for one of the loot's drawable items. When a party
 * member caught it, they are the one WINNER; an item nobody caught has none.
 * PARTY entrants must be other members of the party; both are stored as the
 * loot records them. MAP and MANUAL entrants must be outside the party.
 * Everybody but the winner must be listed once and able to wear the item.
 * Tickets are the manager's, and the ticket order must hold each entrant's
 * tickets exactly.
 */
export const buildLootDrawEntrants = (
  loot: LootDrawLoot,
  request: CreateLootDrawRequest,
): LootDrawEntrantsResult => {
  const item = loot.items.find(({ hid }) => hid === request.itemHid);

  if (!item) return { error: ErrorKey.LOOT_DRAW_ITEM_NOT_FOUND };

  if (!isLootDrawItem(item)) {
    return { error: ErrorKey.LOOT_DRAW_ITEM_NOT_DRAWABLE };
  }

  const owner = findLootItemOwner(loot, item.hid);
  const winners = request.entrants.filter(({ source }) => source === "WINNER");
  const ownerKeys = owner ? playerKeys(owner) : [];

  const isWinnerValid = owner
    ? winners.length === 1 &&
      winners.every((winner) =>
        playerKeys(winner).some((key) => ownerKeys.includes(key)),
      )
    : winners.length === 0;

  if (!isWinnerValid) return { error: ErrorKey.LOOT_DRAW_WINNER_MISMATCH };

  const partyKeys = new Set(loot.players.flatMap(playerKeys));
  const enteredKeys = new Set(ownerKeys);
  const entrants: LootDrawEntrantRecord[] = [];

  for (const entrant of request.entrants) {
    if (entrant.source === "WINNER" && owner) {
      entrants.push(fromPartyMember(owner, "WINNER", entrant.tickets));
      continue;
    }

    const keys = playerKeys(entrant);

    if (keys.some((key) => enteredKeys.has(key))) {
      return { error: ErrorKey.LOOT_DRAW_DUPLICATE_OUTSIDER };
    }

    let record: LootDrawEntrantRecord;

    if (entrant.source === "PARTY") {
      const member = loot.players.find((player) =>
        playerKeys(player).some((key) => keys.includes(key)),
      );

      if (!member) return { error: ErrorKey.LOOT_DRAW_PARTY_MEMBER_NOT_FOUND };

      record = fromPartyMember(member, "PARTY", entrant.tickets);
      keys.push(...playerKeys(member));
    } else {
      if (keys.some((key) => partyKeys.has(key))) {
        return { error: ErrorKey.LOOT_DRAW_OUTSIDER_IN_PARTY };
      }

      record = { ...entrant, name: entrant.name.trim() };
    }

    if (!canWearLootDrawItem(item, record)) {
      return { error: ErrorKey.LOOT_DRAW_OUTSIDER_INELIGIBLE };
    }

    for (const key of keys) enteredKeys.add(key);
    entrants.push(record);
  }

  if (!isLootDrawTicketOrder(request.ticketOrder, request.entrants)) {
    return { error: ErrorKey.LOOT_DRAW_INVALID_TICKET_ORDER };
  }

  return { entrants };
};
