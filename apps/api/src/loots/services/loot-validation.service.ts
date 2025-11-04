import { Injectable } from '@nestjs/common';
import type { CreateLootDto } from 'src/loots/dto/create-loot.dto';
import {
  Profession,
  type ItemRarity,
  type LootlogConfigNpc,
  NpcType,
} from 'generated/client';
import { getProfByShortname } from 'src/shared/utils/get-prof-by-shortname';
import { getItemTypeByCl } from 'src/shared/utils/get-item-type-by-cl';
import { getNpcTypeByWt } from 'src/shared/utils/get-npc-type-by-wt';

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

interface ProcessedNpcData {
  highest: CreateLootDto['npcs'][0];
  sorted: CreateLootDto['npcs'];
  mapped: Array<{
    id: number;
    name: string;
    lvl: number;
    prof: Profession;
    icon: string;
    wt: number;
    location: string;
    type: string;
    margonemType: number;
    hpp: number;
  }>;
}

@Injectable()
export class LootValidationService {
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

  processNpcs(npcs: CreateLootDto['npcs']): ProcessedNpcData {
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

  getLootForGivenConfig(
    loot: CreateLootDto['loots'],
    npcs: LootlogConfigNpc[],
    highestWtNpcType: string,
  ) {
    const targetNpc = npcs.find((npc) => npc.npcType === highestWtNpcType);
    if (!targetNpc) return [];
    return loot
      .map((item) => {
        const { rarity, lvl, type, prof } = this.getItemStats(item);
        if (!targetNpc.allowedRarities.includes(rarity)) return null;
        return {
          id: item.id,
          hid: item.hid,
          name: item.name,
          icon: item.icon,
          stat: item.stat,
          pr: item.pr,
          rarity,
          prc: item.prc,
          type,
          prof,
          lvl,
        };
      })
      .filter(Boolean);
  }

  mapItems(items: CreateLootDto['loots']): ParsedLootItem[] {
    return items.map((item) => {
      const { lvl, rarity, prof, type } = this.getItemStats(item);

      return {
        id: String(item.id),
        hid: item.hid,
        name: item.name,
        icon: item.icon,
        stat: item.stat,
        pr: item.pr,
        prc: Number(item.prc),
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
  ): Record<string, string[]> {
    return items.reduce(
      (acc, item) => {
        if (item.own) {
          const player = players.find((p) => p.id === item.own);
          const playerId = player ? `${player.id}${player.accountId}` : null;
          if (!playerId) return acc;

          acc[playerId] = [item.hid];
        }

        return acc;
      },
      {} as Record<string, string[]>,
    );
  }

  mapPlayers(players: CreateLootDto['players']): ParsedPlayer[] {
    return players.map((player) => ({
      id: `${player.id}${player.accountId}`,
      name: player.name,
      lvl: player.lvl,
      prof: getProfByShortname(player.prof),
      icon: player.icon,
      characterId: player.id.toString(),
      accountId: player.accountId.toString(),
    }));
  }

  mapPlayersForIndexing(players: ParsedPlayer[]) {
    return players.map((player) => ({
      id: player.id,
      characterId: Number(player.characterId),
      accountId: Number(player.accountId),
      name: player.name,
      lvl: player.lvl,
      prof: player.prof.toString(),
      icon: player.icon,
    }));
  }

  mapNpcsForIndexing(npcs: ProcessedNpcData['mapped']) {
    return npcs.map((npc) => ({
      id: npc.id,
      name: npc.name,
      lvl: npc.lvl,
      prof: npc.prof,
      icon: npc.icon,
      wt: npc.wt,
      location: npc.location,
      type: npc.type,
      margonemType: npc.margonemType,
      hpp: npc.hpp,
    }));
  }
}
