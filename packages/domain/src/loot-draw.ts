import { hasItemStat } from "./item-stat.js";
import { PRODUCT_LOCALE } from "./locale.js";

/**
 * The draw a Lootlog runs for a looted legendary item among the players who
 * could not join the party, because Margonem fits ten players in one.
 *
 * Whoever caught the item in the game always enters. They get one ticket for
 * every party member of a profession that can wear the item, themselves
 * included, because the game already drew between those; never fewer than
 * one. Each player outside the party of such a profession gets one ticket.
 *
 * A Lootlog may also draw for its own reasons: among party members too, or
 * for an item nobody caught. Once party members enter, the game's draw no
 * longer stands for them: the winner gets one ticket, like every other party
 * member of such a profession.
 */

export type LootDrawItem = Readonly<{
  /** Professions that can wear the item. */
  prof: readonly string[];
}>;

export type LootDrawCandidate = Readonly<{ prof: string | null }>;

/**
 * Only legendary items are drawn among the players left out of the party,
 * and only those the winner can hand over: colossi and titans drop items
 * bound for good (`permbound`).
 */
export const isLootDrawItem = (item: {
  rarity: string | null | undefined;
  stat: string;
}) => item.rarity === "LEGENDARY" && !hasItemStat(item.stat, "permbound");

/**
 * Whether a loot keeps the players on the map at the drop: a fight that
 * dropped a legendary item.
 */
export const capturesMapPlayers = (loot: {
  source: string;
  rarities: readonly (string | null | undefined)[];
}) =>
  loot.source === "FIGHT" &&
  loot.rarities.some((rarity) => rarity === "LEGENDARY");

/**
 * The party member who caught the item: the one its loot share names, or the
 * only player of a solo loot, whose share Margonem leaves empty. Null when the
 * item stayed without a share in a party.
 */
export const findLootItemOwner = <Player extends { id: string | number }>(
  loot: {
    lootShare: Readonly<Record<string, readonly string[]>>;
    players: readonly Player[];
  },
  hid: string,
): Player | null => {
  const owner = loot.players.find(({ id }) =>
    loot.lootShare[String(id)]?.includes(hid),
  );

  if (owner) return owner;

  return loot.players.length === 1 ? (loot.players[0] ?? null) : null;
};

/** Whether the candidate's profession can wear the item; levels do not count. */
export const canWearLootDrawItem = (
  item: LootDrawItem,
  candidate: LootDrawCandidate,
) => candidate.prof !== null && item.prof.includes(candidate.prof);

/**
 * The tickets of the player who caught the item, from the whole party, or one
 * when other party members enter the draw themselves.
 */
export const lootDrawWinnerTickets = (
  item: LootDrawItem,
  party: readonly LootDrawCandidate[],
  partyEntered = false,
) =>
  partyEntered
    ? 1
    : Math.max(
        1,
        party.filter((member) => canWearLootDrawItem(item, member)).length,
      );

/** The most tickets one entrant may hold, so a wheel stays readable. */
export const MAX_LOOT_DRAW_TICKETS = 99;

/**
 * The wheel's tickets in order, each naming its entrant's index: every
 * entrant's tickets side by side, as a wheel shows them before a shuffle.
 */
export const groupedLootDrawTicketOrder = (
  entrants: readonly { tickets: number }[],
) =>
  entrants.flatMap((entrant, index) =>
    Array.from({ length: entrant.tickets }, () => index),
  );

/** Whether `order` holds exactly each entrant's tickets, in any order. */
export const isLootDrawTicketOrder = (
  order: readonly number[],
  entrants: readonly { tickets: number }[],
) => {
  const counts = entrants.map(() => 0);

  for (const index of order) {
    if (!Number.isInteger(index) || counts[index] === undefined) return false;

    counts[index] += 1;
  }

  return counts.every((count, index) => count === entrants[index]?.tickets);
};

/** A uniformly shuffled copy of `order`, for a wheel with mixed slices. */
export const shuffleLootDrawTicketOrder = (
  order: readonly number[],
  random: () => number = Math.random,
) => {
  const shuffled = [...order];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const current = shuffled[index];
    const swapped = shuffled[other];

    if (current === undefined || swapped === undefined) continue;

    shuffled[index] = swapped;
    shuffled[other] = current;
  }

  return shuffled;
};

const ticketPlural = new Intl.PluralRules(PRODUCT_LOCALE);

const TICKET_WORDS: Partial<Record<Intl.LDMLPluralRule, string>> = {
  one: "los",
  few: "losy",
};

/** A whole number of tickets in Polish: `1 los`, `3 losy`, `5 losów`. */
export const formatLootDrawTickets = (count: number) =>
  `${count} ${TICKET_WORDS[ticketPlural.select(count)] ?? "losów"}`;

/** An entrant's share of all tickets, in percent with one decimal. */
export const lootDrawTicketShare = (tickets: number, totalTickets: number) =>
  totalTickets > 0 ? Math.round((tickets / totalTickets) * 1000) / 10 : 0;

/**
 * Where in the winning ticket the pointer stops, as a share of the ticket
 * from its start: anywhere but its very edges, and more often near one, so
 * a wheel seems to almost land on a neighbour. The draw's id fixes it, so
 * every wheel and card of one draw stops at the same place.
 */
export const lootDrawLandingOffset = (drawId: number) => {
  // One round of mulberry32 spreads consecutive ids over [0, 1).
  let hash = (drawId + 0x6d2b79f5) | 0;
  hash = Math.imul(hash ^ (hash >>> 15), hash | 1);
  hash ^= hash + Math.imul(hash ^ (hash >>> 7), hash | 61);
  const uniform = ((hash ^ (hash >>> 14)) >>> 0) / 4294967296;

  // The arcsine shape gathers stops towards both edges.
  const edgeBiased = (1 - Math.cos(Math.PI * uniform)) / 2;

  return 0.08 + 0.84 * edgeBiased;
};
