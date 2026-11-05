import {
  canWearLootDrawItem,
  lootDrawWinnerTickets,
} from "@lootlog/domain/loot-draw";
import {
  LootDrawEntrantDtoProf,
  type LootDrawEntrantDto,
} from "@lootlog/client/main";
import type { Item, Loot } from "@/lib/loots/loot-types";
import { buildLootRoster } from "@/features/guild/loots-list/components/loots-list/build-loot-roster";

export type LootDrawDraftEntrant = LootDrawEntrantDto & {
  key: string;
  /** The tickets the draw's rule gives this entrant. */
  defaultTickets: number;
};

export type LootDrawSetup = {
  /** The winner from the game first, then the eligible map players. */
  entrants: LootDrawDraftEntrant[];
  /** Map players outside the party left out because they cannot wear it. */
  ineligibleCount: number;
  /** False when the loot kept no map players to suggest. */
  hasMapPlayers: boolean;
};

const nameKey = (name: string) => `name:${name.trim().toLowerCase()}`;

export const lootDrawPlayerKey = (player: {
  characterId: number | null;
  name: string;
}) =>
  player.characterId !== null && player.characterId > 0
    ? `character:${player.characterId}`
    : nameKey(player.name);

/** The party member who caught `item`, if anybody did. */
export const findLootDrawWinner = (loot: Loot, item: Item) => {
  const ownerId = Object.entries(loot.lootShare).find(([, hids]) =>
    hids.includes(item.hid),
  )?.[0];

  return loot.players.find(({ id }) => id === ownerId) ?? null;
};

/** Who enters a draw for `item` before a manager edits it; null when nobody caught it. */
export const buildLootDrawSetup = (
  loot: Loot,
  item: Item,
): LootDrawSetup | null => {
  const winner = findLootDrawWinner(loot, item);

  if (!winner) return null;

  const { bystanders } = buildLootRoster(loot);

  const eligible = bystanders.filter((player) =>
    canWearLootDrawItem(item, player),
  );

  const winnerTickets = lootDrawWinnerTickets(item, loot.players);

  return {
    entrants: [
      {
        key: lootDrawPlayerKey(winner),
        name: winner.name,
        accountId: winner.accountId,
        characterId: winner.characterId,
        prof: winner.prof,
        lvl: winner.lvl,
        icon: winner.icon,
        source: "WINNER",
        tickets: winnerTickets,
        defaultTickets: winnerTickets,
      },
      ...eligible.map((player) => ({
        key: lootDrawPlayerKey(player),
        name: player.name,
        accountId: player.accountId,
        characterId: player.characterId,
        // The roster widens the snapshot's profession to a string.
        prof:
          Object.values(LootDrawEntrantDtoProf).find(
            (profession) => profession === player.prof,
          ) ?? null,
        lvl: player.lvl,
        icon: player.icon,
        source: "MAP" as const,
        tickets: 1,
        defaultTickets: 1,
      })),
    ],
    ineligibleCount: bystanders.length - eligible.length,
    hasMapPlayers: (loot.mapPlayersSnapshot?.length ?? 0) > 0,
  };
};

/**
 * Why a hand-added player cannot enter, or null when they can. The form
 * offers only the item's professions, so the profession always fits.
 */
export const lootDrawAddError = (
  loot: Loot,
  entrants: readonly LootDrawDraftEntrant[],
  candidate: { name: string },
): "inParty" | "duplicate" | null => {
  const key = nameKey(candidate.name);

  if (loot.players.some((player) => nameKey(player.name) === key)) {
    return "inParty";
  }

  if (entrants.some((entrant) => nameKey(entrant.name) === key)) {
    return "duplicate";
  }

  return null;
};
