import {
  canWearLootDrawItem,
  isLootDrawTicketOrder,
} from "@lootlog/domain/loot-draw";
import type { CreateLootDrawRequest } from "#src/contracts/loots/schemas";
import type { LootDrawEntrantRecord } from "#src/database/drizzle/schema";
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

/**
 * Checks a manager's draw for one of the loot's items. The one WINNER must
 * be the party member who caught it; it is stored as the loot records them.
 * Every other entrant must be outside the party, listed once and able to
 * wear the item. Tickets are the manager's, and the ticket order must hold
 * each entrant's tickets exactly.
 */
export const buildLootDrawEntrants = (
  loot: LootDrawLoot,
  request: CreateLootDrawRequest,
): LootDrawEntrantsResult => {
  const item = loot.items.find(({ hid }) => hid === request.itemHid);

  if (!item) return { error: ErrorKey.LOOT_DRAW_ITEM_NOT_FOUND };

  const ownerId = Object.entries(loot.lootShare).find(([, hids]) =>
    hids.includes(item.hid),
  )?.[0];

  const owner = loot.players.find(({ id }) => id === ownerId);

  if (!owner) return { error: ErrorKey.LOOT_DRAW_ITEM_UNASSIGNED };

  const winners = request.entrants.filter(({ source }) => source === "WINNER");
  const [winner] = winners;
  const ownerKeys = new Set(playerKeys(owner));

  if (
    winners.length !== 1 ||
    !winner ||
    !playerKeys(winner).some((key) => ownerKeys.has(key))
  ) {
    return { error: ErrorKey.LOOT_DRAW_WINNER_MISMATCH };
  }

  const partyKeys = new Set(loot.players.flatMap(playerKeys));
  const outsiderKeys = new Set<string>();

  for (const entrant of request.entrants) {
    if (entrant.source === "WINNER") continue;

    const keys = playerKeys(entrant);

    if (keys.some((key) => partyKeys.has(key))) {
      return { error: ErrorKey.LOOT_DRAW_OUTSIDER_IN_PARTY };
    }

    if (keys.some((key) => outsiderKeys.has(key))) {
      return { error: ErrorKey.LOOT_DRAW_DUPLICATE_OUTSIDER };
    }

    if (!canWearLootDrawItem(item, entrant)) {
      return { error: ErrorKey.LOOT_DRAW_OUTSIDER_INELIGIBLE };
    }

    for (const key of keys) outsiderKeys.add(key);
  }

  if (!isLootDrawTicketOrder(request.ticketOrder, request.entrants)) {
    return { error: ErrorKey.LOOT_DRAW_INVALID_TICKET_ORDER };
  }

  return {
    entrants: request.entrants.map((entrant) =>
      entrant.source === "WINNER"
        ? {
            name: owner.name,
            accountId: owner.accountId,
            characterId: owner.characterId,
            prof: owner.prof,
            lvl: owner.lvl,
            icon: owner.icon,
            source: "WINNER",
            tickets: entrant.tickets,
          }
        : { ...entrant, name: entrant.name.trim() },
    ),
  };
};
