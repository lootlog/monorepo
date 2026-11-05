/**
 * The draw a Lootlog runs for a looted item among the players who could not
 * join the party, because Margonem fits ten players in one.
 *
 * Whoever caught the item in the game always enters. They get one ticket for
 * every party member who could wear the item, themselves included, because
 * the game already drew between those; never fewer than one. Each player
 * outside the party who could wear it gets one ticket.
 */

export type LootDrawItem = Readonly<{
  /** Professions that can wear the item. */
  prof: readonly string[];
  /** The level it requires. */
  lvl: number;
  stat: string;
}>;

export type LootDrawCandidate = Readonly<{
  prof: string | null;
  lvl: number | null;
}>;

/** Drops worth a draw, the ones whose map players a Lootlog keeps. */
const DRAW_RARITIES: ReadonlySet<string> = new Set([
  "UNIQUE",
  "HEROIC",
  "LEGENDARY",
]);

/**
 * Whether a loot keeps the players on the map at the drop: a fight that
 * dropped a unique or better item.
 */
export const capturesMapPlayers = (loot: {
  source: string;
  rarities: readonly (string | null | undefined)[];
}) =>
  loot.source === "FIGHT" &&
  loot.rarities.some((rarity) => DRAW_RARITIES.has(rarity ?? ""));

/** Elastic items take the looter's level, so they require none of their own. */
export const isElasticLootDrawItem = (item: Pick<LootDrawItem, "stat">) =>
  item.stat.split(";").some((entry) => /^lvladjust(=|$)/.test(entry));

/**
 * Whether the candidate's profession lets them wear the item, and their
 * level when it is known: hand-added players often come without one.
 */
export const canWearLootDrawItem = (
  item: LootDrawItem,
  candidate: LootDrawCandidate,
) =>
  candidate.prof !== null &&
  item.prof.includes(candidate.prof) &&
  (isElasticLootDrawItem(item) ||
    candidate.lvl === null ||
    candidate.lvl >= item.lvl);

/** The tickets of the player who caught the item, from the whole party. */
export const lootDrawWinnerTickets = (
  item: LootDrawItem,
  party: readonly LootDrawCandidate[],
) =>
  Math.max(
    1,
    party.filter((member) => canWearLootDrawItem(item, member)).length,
  );

/** The most tickets one entrant may hold, so a wheel stays readable. */
export const MAX_LOOT_DRAW_TICKETS = 99;

export const totalLootDrawTickets = (
  entrants: readonly { tickets: number }[],
) => entrants.reduce((total, entrant) => total + entrant.tickets, 0);

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
