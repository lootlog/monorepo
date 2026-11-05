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
const isElasticItem = (item: LootDrawItem) =>
  item.stat.split(";").some((entry) => /^lvladjust(=|$)/.test(entry));

/** Whether the candidate's profession and level let them wear the item. */
export const canWearLootDrawItem = (
  item: LootDrawItem,
  candidate: LootDrawCandidate,
) =>
  candidate.prof !== null &&
  item.prof.includes(candidate.prof) &&
  (isElasticItem(item) ||
    (candidate.lvl !== null && candidate.lvl >= item.lvl));

/** The tickets of the player who caught the item, from the whole party. */
export const lootDrawWinnerTickets = (
  item: LootDrawItem,
  party: readonly LootDrawCandidate[],
) =>
  Math.max(
    1,
    party.filter((member) => canWearLootDrawItem(item, member)).length,
  );

/**
 * The entrant holding ticket `roll`, counting tickets from 0 in entrant
 * order; `roll` must be below the total.
 */
export const pickLootDrawEntrant = <T extends { tickets: number }>(
  entrants: readonly T[],
  roll: number,
): T => {
  let remaining = roll;

  for (const entrant of entrants) {
    if (remaining < entrant.tickets) return entrant;

    remaining -= entrant.tickets;
  }

  throw new RangeError(`Roll ${roll} is outside the drawn tickets`);
};

export const totalLootDrawTickets = (
  entrants: readonly { tickets: number }[],
) => entrants.reduce((total, entrant) => total + entrant.tickets, 0);
