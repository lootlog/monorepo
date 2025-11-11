import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { CreateLootDto } from 'src/loots/dto/create-loot.dto';
import { Profession, type ItemRarity } from 'generated/client';
import { getProfByShortname } from 'src/shared/utils/get-prof-by-shortname';
import { getItemTypeByCl } from 'src/shared/utils/get-item-type-by-cl';
import { getNpcTypeByWt } from 'src/shared/utils/get-npc-type-by-wt';
import {
  LOOT_SHARE_ITEM_REGEX,
  LOOT_SHARE_MSG_REGEX,
} from 'src/loots/constants/loot-share-msg-regex';

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
  createUniqueLootId(loots: CreateLootDto['loots'], world: string): string {
    const string =
      [...loots]
        .sort((a, b) => a.hid.localeCompare(b.hid))
        .map((loot) => loot.hid)
        .join('') + world;
    return createHash('sha256').update(string).digest('hex');
  }

  parseItemStats(stats: string): Record<string, string> {
    return stats.split(';').reduce(
      (acc, stat) => {
        const [key, value] = stat.split('=');
        if (key && value) acc[key] = value;
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  getItemStats({ stat, cl }: CreateLootDto['loots'][0]) {
    const parsedStats = this.parseItemStats(stat);
    const lvl = parsedStats['lvl'] ? Number(parsedStats['lvl']) : 0;
    const rarity = parsedStats['rarity']?.toUpperCase() as ItemRarity;
    const requiredProf = parsedStats['reqp'] as string;
    const requiredProfArray = requiredProf
      ? requiredProf
          .split('')
          .map((id) => getProfByShortname(id))
          .filter(Boolean)
      : Object.values(Profession);
    const type = getItemTypeByCl(cl);
    return { lvl, rarity, prof: requiredProfArray, type };
  }

  parseJsonField(field: unknown): unknown {
    return typeof field === 'string' ? JSON.parse(field) : field;
  }

  processNpcs(npcs: CreateLootDto['npcs']) {
    const sorted = [...npcs].sort((a, b) => b.wt - a.wt);
    return {
      highest: sorted[0],
      sorted,
      mapped: sorted.map((npc) => ({
        id: npc.id,
        name: npc.name,
        lvl: npc.lvl,
        prof: getProfByShortname(npc.prof),
        icon: npc.icon,
        wt: npc.wt,
        location: npc.location,
        type: getNpcTypeByWt(npc.wt, npc.prof, npc.type),
        margonemType: npc.type,
        hpp: npc.hpp,
      })),
    };
  }

  sortNpcsByWt(npcs: CreateLootDto['npcs']) {
    return [...npcs].sort((a, b) => b.wt - a.wt);
  }

  mapItems(items: CreateLootDto['loots']) {
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

  mapLootShare(
    items: CreateLootDto['loots'],
    players: CreateLootDto['players'],
  ) {
    return items.reduce((acc, item) => {
      if (item.own) {
        const player = players.find((p) => p.id === item.own);
        const playerId = player ? `${player.id}${player.accountId}` : null;
        if (!playerId) return acc;

        acc[playerId] = [item.hid];
      }

      return acc;
    }, {});
  }

  mapNpcs(npcs: CreateLootDto['npcs']) {
    return npcs.map((npc) => ({
      id: npc.id,
      name: npc.name,
      lvl: npc.lvl,
      prof: getProfByShortname(npc.prof),
      icon: npc.icon,
      wt: npc.wt,
      location: npc.location,
      type: getNpcTypeByWt(npc.wt, npc.prof, npc.type),
      margonemType: npc.type,
      hpp: npc.hpp,
    }));
  }

  mapPlayers(players: CreateLootDto['players']) {
    return players.map((player) => ({
      id: `${player.id}${player.accountId}`,
      name: player.name,
      lvl: player.lvl,
      prof: getProfByShortname(player.prof),
      icon: player.icon,
      characterId: player.id,
      accountId: player.accountId,
      hpp: player.hpp,
    }));
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
}
