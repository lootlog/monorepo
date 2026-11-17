import { playerSearchId } from "@lootlog/protocol/rabbit/events";
import {
  createItemSnapshotHash,
  createItemStatsHash,
} from "@lootlog/database/snapshot-hash";
import { parseItemStats, splitItemStat } from "@lootlog/database/item-stat";
import { Schema } from "effect";
import {
  compareNpcsStrongestFirst,
  getNpcType,
} from "@lootlog/domain/npc-type";
import { InvalidRequestError } from "#src/shared/http/http-errors";
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

// Older game clients appended the account id to participant character ids.
export const LEGACY_ID = { legacyCombinedId: true } as const;

/**
 * The catalog identity stored for a looted NPC. A reported template wins; a
 * spawn without one stays in the runtime namespace instead of posing as a
 * template. Clients that send only the overloaded `id` keep `legacy`.
 */
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

/** The strongest NPC names the loot, as every view of it does. */
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
  const parsedStats = parseItemStats(item.stat);
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

export function mapPlayers(players: CreateLootRequest["players"]) {
  return players.map((player) => {
    const { accountId, characterId } = normalizeCharacterAndAccount(
      player.id,
      player.accountId,
    );

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
      statsSnapshot: parseItemStats(revision),
      hid: item.hid,
      instanceStat: instance,
    };
  });
}

export function mapLootPlayersToPersistence(
  players: CreateLootRequest["players"],
  world: string,
) {
  return players.map((player) => {
    const prof = getProfByShortname(player.prof) ?? null;

    const { accountId, characterId } = normalizeCharacterAndAccount(
      player.id,
      player.accountId,
    );

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

export function normalizeCharacterAndAccount(
  id: string | number,
  accountId: string | number,
) {
  const identity = parseCharacterIdentity(id, accountId, LEGACY_ID);

  // acceptWithLock rejects a loot with an invalid participant first.
  if (!identity) throw new InvalidRequestError("Invalid player id");

  return identity;
}

export function mapLootNpcsToPersistence(npcs: CreateLootRequest["npcs"]) {
  return npcs.map((npc) => ({
    ...lootNpcIdentity(npc),
    runtimeNpcId: npc.runtimeId ?? null,
    name: npc.name,
    type: getNpcType(NpcType, npc),
    lvl: npc.lvl,
    // Senders may report the rendered CDN URL of the graphic; a revision
    // must not depend on which form a sender chose.
    icon: normalizeNpcIcon(npc.icon),
    wt: npc.wt,
    margonemType: npc.type,
    prof: getProfByShortname(npc.prof ?? "") ?? null,
  }));
}
