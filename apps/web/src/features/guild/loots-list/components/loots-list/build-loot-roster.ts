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
  /** Players who took part in the loot, those with items first. */
  recipients: LootRosterPlayer[];
  unassignedItems: Item[];
  /** Players recorded on the map at drop time who did not take part. */
  bystanders: LootRosterPlayer[];
  /**
   * True when the add-on keeps map players for loots like this one (a fight
   * with a unique or better drop) but none were recorded.
   */
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

  // Matching is by character id only: names are not unique across worlds
  // and legacy records without ids must not be paired by guesswork.
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
