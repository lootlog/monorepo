import { playerSearchId } from "@lootlog/protocol/rabbit/events";
import {
  createItemSnapshotHash,
  createItemStatsHash,
} from "@lootlog/database/snapshot-hash";
import { itemStatRecord, splitItemStat } from "@lootlog/domain/item-stat";
import { Schema } from "effect";
import {
  compareNpcsStrongestFirst,
  getNpcType,
} from "@lootlog/domain/npc-type";
import { InvalidRequestError } from "@lootlog/protocol/http/errors";
import { ItemRaritySchema } from "@lootlog/schema/item-rarity";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { NpcIdentityNamespace } from "@lootlog/schema/npc-identity";
import type { CreateLootRequest } from "#src/contracts/loots/schemas";
import { ErrorKey } from "#src/loots/error-key";
import { getItemTypeByCl } from "@lootlog/domain/item-type";
import { normalizeNpcIcon } from "@lootlog/domain/npc-icon";
import type { GameVersion } from "@lootlog/schema/game-version";
import { getProfByShortname } from "@lootlog/domain/profession";
import { parseRequiredProfessions } from "#src/loots/required-professions";
import { parseCharacterIdentity } from "#src/shared/margonem/player-snapshot.repository";

const LEGACY_ID = { legacyCombinedId: true } as const;

const lootNpcIdentity = (npc: CreateLootRequest["npcs"][number]) => {
  if (npc.templateId !== undefined && npc.templateId !== null) {
    return {
      identityNamespace: NpcIdentityNamespace.TEMPLATE,
      npcId: npc.templateId,
    };
  }

  if (npc.runtimeId !== undefined) {
    return {
      identityNamespace: NpcIdentityNamespace.RUNTIME,
      npcId: npc.runtimeId,
    };
  }

  return { identityNamespace: NpcIdentityNamespace.LEGACY, npcId: npc.id };
};

export function processNpcs(npcs: CreateLootRequest["npcs"]) {
  const [primary] = npcs.toSorted((left, right) =>
    compareNpcsStrongestFirst(
      {
        type: getNpcType(NpcType, left),
        wt: left.wt,
        lvl: left.lvl,
        npcId: lootNpcIdentity(left).npcId,
      },
      {
        type: getNpcType(NpcType, right),
        wt: right.wt,
        lvl: right.lvl,
        npcId: lootNpcIdentity(right).npcId,
      },
    ),
  );

  if (!primary) {
    throw new InvalidRequestError({ code: ErrorKey.NPC_WT_TOO_LOW });
  }

  return { primary };
}

export function getItemStats(item: CreateLootRequest["loots"][number]) {
  const parsedStats = itemStatRecord(item.stat);
  const lvl = parsedStats["lvl"] ? Number(parsedStats["lvl"]) : 0;
  const rawRarity = parsedStats["rarity"]?.toUpperCase();

  const rarity =
    rawRarity === undefined
      ? undefined
      : Schema.decodeUnknownSync(ItemRaritySchema)(rawRarity);

  const prof = parseRequiredProfessions(parsedStats["reqp"]);

  return { lvl, rarity, prof, type: getItemTypeByCl(item.cl) };
}

export function mapItems(items: CreateLootRequest["loots"]) {
  return items.map((item) => ({ ...item, ...getItemStats(item) }));
}

export type AcceptedPlayer = CreateLootRequest["players"][number] & {
  readonly identity: {
    readonly accountId: number;
    readonly characterId: number;
  };
};

export function parsePlayers(
  players: CreateLootRequest["players"],
): AcceptedPlayer[] | null {
  const accepted: AcceptedPlayer[] = [];

  for (const player of players) {
    const identity = parseCharacterIdentity(
      player.id,
      player.accountId,
      LEGACY_ID,
    );

    if (!identity) return null;

    accepted.push({ ...player, identity });
  }

  return accepted;
}

export function mapPlayers(players: ReadonlyArray<AcceptedPlayer>) {
  return players.map((player) => {
    const { accountId, characterId } = player.identity;

    return {
      id: playerSearchId(characterId, accountId),
      name: player.name,
      lvl: player.lvl,
      prof: getProfByShortname(player.prof),
      icon: player.icon,
      characterId,
      accountId,
    };
  });
}

export function mapLootItemsToPersistence(
  items: CreateLootRequest["loots"],
  gameVersion: GameVersion,
) {
  return items.map((item) => {
    const { lvl, rarity, type } = getItemStats(item);
    const { revision, instance } = splitItemStat(item.stat);

    return {
      itemId: item.id,
      gameVersion,
      statsHash: createItemStatsHash(revision),
      snapshotHash: createItemSnapshotHash({
        gameVersion,
        itemId: item.id,
        name: item.name,
        icon: item.icon,
        itemType: type,
        stat: revision,
      }),
      name: item.name,
      icon: item.icon,
      lvl,
      rarity,
      itemType: type,
      statRaw: revision,
      statsSnapshot: itemStatRecord(revision),
      hid: item.hid,
      instanceStat: instance,
    };
  });
}

export function mapLootPlayersToPersistence(
  players: ReadonlyArray<AcceptedPlayer>,
  world: string,
) {
  return players.map((player) => {
    const prof = getProfByShortname(player.prof) ?? null;
    const { accountId, characterId } = player.identity;

    return {
      lvl: player.lvl,
      world,
      accountId,
      characterId,
      name: player.name,
      prof,
      icon: player.icon,
    };
  });
}

export function mapLootNpcsToPersistence(npcs: CreateLootRequest["npcs"]) {
  return npcs.map((npc) => ({
    ...lootNpcIdentity(npc),
    runtimeNpcId: npc.runtimeId ?? null,
    name: npc.name,
    type: getNpcType(NpcType, npc),
    lvl: npc.lvl,
    icon: normalizeNpcIcon(npc.icon),
    wt: npc.wt,
    margonemType: npc.type,
    prof: getProfByShortname(npc.prof ?? "") ?? null,
  }));
}
