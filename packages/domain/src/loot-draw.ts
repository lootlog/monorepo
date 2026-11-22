import { minBy } from "es-toolkit";
import { hasItemStat } from "./item-stat.js";
import { PRODUCT_LOCALE } from "./locale.js";
import { getNpcTypeStrengthRank } from "./npc-type.js";

export type LootDrawItem = Readonly<{
  prof: readonly string[];
}>;

export type LootDrawCandidate = Readonly<{ prof: string | null }>;

export const DEFAULT_LOOT_DRAW_EXCLUDED_NPC_TYPES = [
  "HERO",
  "EVENT_HERO",
  "TITAN",
] as const;

const lootNpcType = (npcs: readonly { type: string | null }[]) =>
  minBy(npcs, ({ type }) => getNpcTypeStrengthRank(type))?.type ?? null;

export const isLootDrawItem = (
  loot: { npcs: readonly { type: string | null }[] },
  item: { rarity: string | null | undefined; stat: string },
  excludedNpcTypes: readonly string[],
) => {
  if (item.rarity !== "LEGENDARY" || hasItemStat(item.stat, "permbound")) {
    return false;
  }

  const npcType = lootNpcType(loot.npcs);

  return npcType === null || !excludedNpcTypes.includes(npcType);
};

export const capturesMapPlayers = (loot: {
  source: string;
  rarities: readonly (string | null | undefined)[];
}) =>
  loot.source === "FIGHT" &&
  loot.rarities.some((rarity) => rarity === "LEGENDARY");

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

export const canWearLootDrawItem = (
  item: LootDrawItem,
  candidate: LootDrawCandidate,
) => candidate.prof !== null && item.prof.includes(candidate.prof);

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

export const MAX_LOOT_DRAW_TICKETS = 99;

export const groupedLootDrawTicketOrder = (
  entrants: readonly { tickets: number }[],
) =>
  entrants.flatMap((entrant, index) =>
    Array.from({ length: entrant.tickets }, () => index),
  );

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

export const formatLootDrawTickets = (count: number) =>
  `${count} ${TICKET_WORDS[ticketPlural.select(count)] ?? "losów"}`;

export const lootDrawTicketShare = (tickets: number, totalTickets: number) =>
  totalTickets > 0 ? Math.round((tickets / totalTickets) * 1000) / 10 : 0;

export const lootDrawLandingOffset = (drawId: number) => {
  let hash = (drawId + 0x6d2b79f5) | 0;
  hash = Math.imul(hash ^ (hash >>> 15), hash | 1);
  hash ^= hash + Math.imul(hash ^ (hash >>> 7), hash | 61);
  const uniform = ((hash ^ (hash >>> 14)) >>> 0) / 4294967296;

  const edgeBiased = (1 - Math.cos(Math.PI * uniform)) / 2;

  return 0.08 + 0.84 * edgeBiased;
};
