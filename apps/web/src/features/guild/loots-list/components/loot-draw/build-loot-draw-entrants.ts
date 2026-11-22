import {
  canWearLootDrawItem,
  findLootItemOwner,
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
  defaultTickets: number;
};

export type LootDrawSetup = {
  entrants: LootDrawDraftEntrant[];
  partyMembers: LootDrawDraftEntrant[];
  ineligibleCount: number;
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

const fromPartyMember = (
  player: Loot["players"][number],
  source: "WINNER" | "PARTY",
  tickets: number,
): LootDrawDraftEntrant => ({
  key: lootDrawPlayerKey(player),
  name: player.name,
  accountId: player.accountId,
  characterId: player.characterId,
  prof: player.prof,
  lvl: player.lvl,
  icon: player.icon,
  source,
  tickets,
  defaultTickets: tickets,
});

export const buildLootDrawSetup = (loot: Loot, item: Item): LootDrawSetup => {
  const winner = findLootItemOwner(loot, item.hid);
  const { bystanders } = buildLootRoster(loot);

  const eligible = bystanders.filter((player) =>
    canWearLootDrawItem(item, player),
  );

  return {
    entrants: [
      ...(winner
        ? [
            fromPartyMember(
              winner,
              "WINNER",
              lootDrawWinnerTickets(item, loot.players),
            ),
          ]
        : []),
      ...eligible.map((player) => ({
        key: lootDrawPlayerKey(player),
        name: player.name,
        accountId: player.accountId,
        characterId: player.characterId,
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
    partyMembers: loot.players
      .filter(
        (player) =>
          player.id !== winner?.id && canWearLootDrawItem(item, player),
      )
      .map((player) => fromPartyMember(player, "PARTY", 1)),
    ineligibleCount: bystanders.length - eligible.length,
    hasMapPlayers: (loot.mapPlayersSnapshot?.length ?? 0) > 0,
  };
};

export const withLootDrawWinnerTickets = (
  loot: Loot,
  item: Item,
  next: readonly LootDrawDraftEntrant[],
) => {
  const defaultTickets = lootDrawWinnerTickets(
    item,
    loot.players,
    next.some(({ source }) => source === "PARTY"),
  );

  return next.map((entrant) =>
    entrant.source === "WINNER"
      ? {
          ...entrant,
          tickets:
            entrant.tickets === entrant.defaultTickets
              ? defaultTickets
              : entrant.tickets,
          defaultTickets,
        }
      : entrant,
  );
};

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
