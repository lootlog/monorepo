import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { getNpcTypeByWt } from "@lootlog/types";
import type { CreateLootDto } from "src/loots/dto/create-loot.dto";
import {
  NpcType,
  Profession,
  type ItemRarity,
  type Prisma,
} from "src/db/domain";
import { getProfByShortname } from "src/shared/utils/get-prof-by-shortname";
import { getItemTypeByCl } from "src/shared/utils/get-item-type-by-cl";
import {
  LOOT_SHARE_ITEM_REGEX,
  LOOT_SHARE_MSG_REGEX,
} from "src/loots/constants/loot-share-msg-regex";

const SNAPSHOT_HASH_IGNORED_KEYS = new Set([
  "created",
  "gold",
  "amount",
  "opis",
]);

interface ParsedPlayer {
  id: string;
  name: string;
  lvl: number;
  prof: Profession;
  icon: string;
  characterId: string;
  accountId: string;
}

interface ParsedLootItem {
  id: string;
  hid: string;
  name: string;
  icon: string;
  stat: string;
  pr: number;
  prc: number;
  lvl: number;
  rarity: ItemRarity;
  prof: Profession[];
  type: string;
}

@Injectable()
export class LootMappingService {
  createUniqueLootId(loots: CreateLootDto["loots"], world: string): string {
    const string =
      [...loots]
        .sort((a, b) => a.hid.localeCompare(b.hid))
        .map((loot) => loot.hid)
        .join("") + world;
    return createHash("sha256").update(string).digest("hex");
  }

  generateStatsHash(stat: string): string {
    const sortedStats = stat
      .split(";")
      .filter((statEntry) => {
        const [key] = statEntry.split("=");
        return Boolean(key) && !SNAPSHOT_HASH_IGNORED_KEYS.has(key);
      })
      .sort()
      .join(";");
    return createHash("sha256").update(sortedStats).digest("hex");
  }

  generatePlayerSnapshotHash(name: string, prof: string, icon: string): string {
    const string = `${name}${prof}${icon}`;
    return createHash("sha256").update(string).digest("hex");
  }

  parseItemStats(stats: string): Record<string, string> {
    return stats.split(";").reduce(
      (acc, stat) => {
        const [key, value] = stat.split("=");
        if (key && value) acc[key] = value;
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  getItemStats({ stat, cl }: CreateLootDto["loots"][0]) {
    const parsedStats = this.parseItemStats(stat);
    const lvl = parsedStats["lvl"] ? Number(parsedStats["lvl"]) : 0;
    const rarity = parsedStats["rarity"]?.toUpperCase() as ItemRarity;
    const requiredProf = parsedStats["reqp"] as string;
    const requiredProfArray = requiredProf
      ? requiredProf
          .split("")
          .map((id) => getProfByShortname(id))
          .filter(Boolean)
      : Object.values(Profession);
    const type = getItemTypeByCl(cl);
    return { lvl, rarity, prof: requiredProfArray, type };
  }

  parseJsonField(field: unknown): unknown {
    return typeof field === "string" ? JSON.parse(field) : field;
  }

  private normalizeCharacterAndAccount(
    id: string | number,
    accountId: string | number,
  ): { characterId: number; accountId: number } {
    const accountStr = String(accountId ?? "");
    const idStr = String(id ?? "");

    if (accountStr && idStr.endsWith(accountStr)) {
      const characterPart = idStr.slice(0, idStr.length - accountStr.length);
      return {
        characterId: Number(characterPart || idStr),
        accountId: Number(accountStr),
      };
    }

    return { characterId: Number(idStr), accountId: Number(accountStr) };
  }

  processNpcs(npcs: CreateLootDto["npcs"]) {
    const sorted = [...npcs].sort((a, b) => b.wt - a.wt);
    return {
      highest: sorted[0],
      sorted,
      mapped: sorted.map((npc) => ({
        id: npc.id,
        name: npc.name,
        lvl: npc.lvl,
        prof: npc.prof ? getProfByShortname(npc.prof) : "",
        icon: npc.icon,
        wt: npc.wt,
        location: npc.location,
        type: getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type),
        margonemType: npc.type,
      })),
    };
  }

  mapItems(items: CreateLootDto["loots"]) {
    return items.map((item) => {
      const { lvl, rarity, prof, type } = this.getItemStats(item);

      return {
        id: item.id,
        hid: item.hid,
        name: item.name,
        icon: item.icon,
        stat: item.stat,
        pr: item.pr,
        prc: item.prc,
        lvl,
        rarity,
        prof,
        type,
      };
    });
  }

  mapPlayers(players: CreateLootDto["players"]) {
    return players.map((player) => {
      const { characterId, accountId } = this.normalizeCharacterAndAccount(
        player.id,
        player.accountId,
      );

      return {
        id: `${characterId}${accountId}`,
        name: player.name,
        lvl: player.lvl,
        prof: getProfByShortname(player.prof),
        icon: player.icon,
        characterId: Number(characterId),
        accountId: Number(accountId),
      };
    });
  }

  mapLootShareFromItemOwners(
    loots: CreateLootDto["loots"],
    players: CreateLootDto["players"],
  ): Record<string, string[]> | null {
    if (loots.length === 0 || loots.length !== players.length) {
      return null;
    }

    const mappedPlayers = this.mapPlayers(players);
    const playerShareIdByCharacterId = new Map<number, string>();
    const shareIds = new Set<string>();

    for (const [index, player] of players.entries()) {
      const shareId = mappedPlayers[index]?.id;
      if (
        shareId === undefined ||
        playerShareIdByCharacterId.has(player.id) ||
        shareIds.has(shareId)
      ) {
        return null;
      }

      playerShareIdByCharacterId.set(player.id, shareId);
      shareIds.add(shareId);
    }

    const assignedCharacterIds = new Set<number>();
    const lootShare: Record<string, string[]> = {};

    for (const loot of loots) {
      if (loot.own === undefined || assignedCharacterIds.has(loot.own)) {
        return null;
      }

      const shareId = playerShareIdByCharacterId.get(loot.own);
      if (shareId === undefined) {
        return null;
      }

      assignedCharacterIds.add(loot.own);
      lootShare[shareId] = [loot.hid];
    }

    return assignedCharacterIds.size === players.length ? lootShare : null;
  }

  getLootShareFromMsg(msg: string) {
    const share: Record<string, string[]> = {};
    let match: RegExpExecArray | null;

    while ((match = LOOT_SHARE_MSG_REGEX.exec(msg)) !== null) {
      const nick = match[1].trim();
      const itemsStr = match[2];

      let itemMatch: RegExpExecArray | null;
      while ((itemMatch = LOOT_SHARE_ITEM_REGEX.exec(itemsStr)) !== null) {
        const itemId = itemMatch[1];
        if (share[nick]) {
          share[nick].push(itemId);
        } else {
          share[nick] = [itemId];
        }
      }
      LOOT_SHARE_ITEM_REGEX.lastIndex = 0;
    }

    return share;
  }

  parseLootShareForUpdate(
    msg: string,
    lootPlayers: unknown,
    lootItems: unknown,
  ): Record<string, string[]> {
    const lootShare = this.getLootShareFromMsg(msg);
    const parsedPlayers = this.parseJsonField(lootPlayers) as ParsedPlayer[];
    const parsedLoot = this.parseJsonField(lootItems) as ParsedLootItem[];

    return Object.entries(lootShare).reduce(
      (acc, [nick, hids]) => {
        const playerId = parsedPlayers.find((p) => p.name === nick)?.id;
        if (!playerId) return acc;

        const itemIds = (hids as string[])
          .map((hid) => parsedLoot.find((item) => item.hid === hid)?.hid)
          .filter(Boolean);

        if (itemIds.length === 0) return acc;

        acc[playerId] = itemIds;
        return acc;
      },
      {} as Record<string, string[]>,
    );
  }

  mapLootItemsToConnectOrCreate(items: CreateLootDto["loots"]) {
    return items.map((item) => {
      const { lvl, rarity, type } = this.getItemStats(item);
      const statsHash = this.generateStatsHash(item.stat);

      return {
        itemSnapshot: {
          connectOrCreate: {
            where: {
              itemId_statsHash: {
                itemId: item.id,
                statsHash,
              },
            },
            create: {
              itemId: item.id,
              statsHash,
              name: item.name,
              icon: item.icon,
              lvl,
              rarity,
              itemType: type,
              statRaw: item.stat,
              statsSnapshot: this.parseItemStats(item.stat),
            },
          },
        },
        hid: item.hid,
      };
    });
  }

  mapLootPlayersToConnectOrCreate(
    players: CreateLootDto["players"],
    world: string,
  ): Prisma.LootPlayerCreateWithoutLootInput[] {
    return players.map((player) => {
      const prof = getProfByShortname(player.prof);
      const { characterId, accountId } = this.normalizeCharacterAndAccount(
        player.id,
        player.accountId,
      );
      const snapshotHash = this.generatePlayerSnapshotHash(
        player.name,
        player.prof,
        player.icon,
      );
      const where: Prisma.PlayerSnapshotWhereUniqueInput = {
        world_accountId_characterId_snapshotHash: {
          world,
          accountId,
          characterId,
          snapshotHash,
        },
      };

      return {
        lvl: player.lvl,
        playerSnapshot: {
          connectOrCreate: {
            where,
            create: {
              world,
              accountId,
              characterId,
              snapshotHash,
              name: player.name,
              prof,
              icon: player.icon,
            },
          },
        },
      };
    });
  }

  mapLootNpcsToConnectOrCreate(npcs: CreateLootDto["npcs"]) {
    return npcs.map((npc) => {
      const type = getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type);

      return {
        npcSnapshot: {
          connectOrCreate: {
            where: {
              npcId_name: {
                npcId: npc.id,
                name: npc.name,
              },
            },
            create: {
              npcId: npc.id,
              name: npc.name,
              type,
              lvl: npc.lvl,
              icon: npc.icon,
              wt: npc.wt,
              margonemType: npc.type,
              prof: npc.prof ? getProfByShortname(npc.prof) : null,
            },
          },
        },
      };
    });
  }
}
