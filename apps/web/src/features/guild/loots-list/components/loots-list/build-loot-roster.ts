import { capturesMapPlayers } from "@lootlog/domain/loot-draw";
import type { Item, Loot } from "@/lib/loots/loot-types";
import {
  buildLootData,
  type LootPresentationData,
} from "./build-loot-presentation";

export type LootRosterPlayer = {
  key: string;
  name: string;
  lvl: number | null;
  prof: string | null;
  icon: string | null;
  accountId: number | null;
  characterId: number | null;
  items: Item[];
};

export type LootRoster = {
  recipients: LootRosterPlayer[];
  unassignedItems: Item[];
  bystanders: LootRosterPlayer[];
  isSnapshotUnavailable: boolean;
};

export type LootRosterInput = LootPresentationData &
  Pick<Loot, "source" | "mapPlayersSnapshot">;

const expectsSnapshot = (loot: LootRosterInput) =>
  capturesMapPlayers({
    source: loot.source,
    rarities: loot.items.map((item) => item.rarity),
  });

export const buildLootRoster = (loot: LootRosterInput): LootRoster => {
  const { sortedPlayers, itemsByPlayer, unassignedItems } = buildLootData(loot);

  const recipients = sortedPlayers.map<LootRosterPlayer>((player) => ({
    key: `recipient:${player.id}`,
    name: player.name,
    lvl: player.lvl,
    prof: player.prof,
    icon: player.icon,
    accountId: player.accountId,
    characterId: player.characterId,
    items: itemsByPlayer[player.id] ?? [],
  }));

  const recipientCharacterIds = new Set(
    loot.players.flatMap(({ characterId }) =>
      characterId !== null && characterId > 0 ? [characterId] : [],
    ),
  );

  const snapshot = loot.mapPlayersSnapshot ?? [];

  const bystanders = snapshot
    .filter((player) => !recipientCharacterIds.has(player.characterId))
    .map<LootRosterPlayer>((player) => ({
      key: `map:${player.accountId}:${player.characterId}`,
      name: player.name,
      lvl: player.lvl ?? null,
      prof: player.prof,
      icon: player.icon,
      accountId: player.accountId,
      characterId: player.characterId,
      items: [],
    }));

  return {
    recipients,
    unassignedItems,
    bystanders,
    isSnapshotUnavailable: snapshot.length === 0 && expectsSnapshot(loot),
  };
};
