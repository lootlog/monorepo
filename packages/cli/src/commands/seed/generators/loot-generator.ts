import { v7 as uuidv7 } from "uuid";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getNpcTypeByWt, NpcTypeEnum } from "@lootlog/types";
import { SCRAPER_CONFIG, SEED_CONFIG } from "../config.js";
import type { GeneratedPlayer } from "./players-generator.js";
import {
  getProfByShortname,
  type Profession,
} from "../utils/get-prof-by-shortname.js";

interface NpcData {
  id: number;
  wt: number;
  hpp: number;
  lvl: number;
  icon: string;
  name: string;
  prof: string;
  type: number;
  location?: string;
  margonemType: number;
}

interface ItemData {
  hid: string;
  id: number;
  icon: string;
  pr: number;
  prc: string;
  st?: number;
  stat: string;
  name: string;
  cl: number;
}

type ItemRarity = "UNIQUE" | "HEROIC" | "LEGENDARY" | "UPGRADED";

export interface GeneratedLoot {
  npcs: Array<{
    id: number;
    wt: number;
    hpp: number;
    lvl: number;
    icon: string;
    name: string;
    prof: Profession;
    type: NpcTypeEnum;
    location: string;
    margonemType: number;
  }>;
  loots: Array<{
    hid: string;
    id: number;
    name: string;
    icon: string;
    pr: number;
    prc: string;
    stat: string;
    cl: number;
    rarity: ItemRarity;
  }>;
  players: Array<{
    id: string;
    name: string;
    lvl: number;
    prof: Profession;
    icon: string;
    characterId: string;
    accountId: string;
    hpp: number;
  }>;
  lootShare: Record<string, string[]>;
  world: string;
  source: string;
  location: string;
}

export class LootGenerator {
  private npcs: NpcData[] = [];
  private items: ItemData[] = [];
  private players: GeneratedPlayer[] = [];

  async initialize(dataPath: string) {
    const npcsPath = path.join(dataPath, "npcs.json");
    const itemsPath = path.join(dataPath, "items.json");
    const playersPath = path.join(dataPath, "players.json");

    try {
      const [npcsData, itemsData, playersData] = await Promise.all([
        readFile(npcsPath, "utf-8"),
        readFile(itemsPath, "utf-8"),
        readFile(playersPath, "utf-8"),
      ]);

      this.npcs = JSON.parse(npcsData);
      this.items = JSON.parse(itemsData);
      this.players = JSON.parse(playersData);

      console.log(
        `Loaded ${this.npcs.length} NPCs, ${this.items.length} items, ${this.players.length} players`,
      );
    } catch (error) {
      console.error("Failed to load data files:", error);
      throw error;
    }
  }

  setData(npcs: NpcData[], items: ItemData[], players: GeneratedPlayer[]) {
    this.npcs = npcs;
    this.items = items;
    this.players = players;
  }

  private getRandomItems(count: number): ItemData[] {
    const result: ItemData[] = [];
    for (let i = 0; i < count; i++) {
      const item = this.items[crypto.randomInt(0, this.items.length)];
      if (item) {
        result.push({
          ...item,
          hid: uuidv7(),
        });
      }
    }
    return result;
  }

  private getRandomNpc(): NpcData {
    const npc = this.npcs[crypto.randomInt(0, this.npcs.length)];
    if (!npc) {
      throw new Error("No NPCs available");
    }
    return npc;
  }

  private getRandomPlayers(count: number): GeneratedPlayer[] {
    const result: GeneratedPlayer[] = [];
    for (let i = 0; i < count; i++) {
      const player = this.players[crypto.randomInt(0, this.players.length)];
      if (player) {
        result.push(player);
      }
    }
    return result;
  }

  private getRandomRarity(): ItemRarity {
    const rarities: ItemRarity[] = ["UNIQUE", "HEROIC", "LEGENDARY"];
    const weights = [50, 30, 15];

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = crypto.randomInt(0, totalWeight);

    let cumulativeWeight = 0;
    for (let i = 0; i < rarities.length; i++) {
      const weight = weights[i];
      const rarity = rarities[i];
      if (weight !== undefined && rarity !== undefined) {
        cumulativeWeight += weight;
        if (random < cumulativeWeight) {
          return rarity;
        }
      }
    }

    return "UNIQUE";
  }

  generate(): GeneratedLoot {
    const { worlds, lootSources } = SCRAPER_CONFIG;
    const { itemsPerLoot, playersPerLoot } = SEED_CONFIG.loots;

    const source =
      lootSources[crypto.randomInt(0, lootSources.length)] ?? "FIGHT";
    const world = worlds[crypto.randomInt(0, worlds.length)] ?? "gordion";

    const itemsConfig =
      source === "FIGHT" ? itemsPerLoot.fight : itemsPerLoot.dialog;
    const playersConfig =
      source === "FIGHT" ? playersPerLoot.fight : playersPerLoot.dialog;

    const itemCount = crypto.randomInt(itemsConfig.min, itemsConfig.max + 1);
    const playerCount = crypto.randomInt(
      playersConfig.min,
      playersConfig.max + 1,
    );

    const items = this.getRandomItems(itemCount);
    const npc = this.getRandomNpc();
    const players = this.getRandomPlayers(playerCount);

    const mappedPlayers = players.map((player) => ({
      id: `${player.characterId}${player.originalId}`,
      name: player.name,
      lvl: player.lvl,
      prof: getProfByShortname(player.prof),
      icon: player.icon,
      characterId: player.characterId,
      accountId: String(player.originalId),
      hpp: crypto.randomInt(0, 101),
    }));

    const lootShare: Record<string, string[]> = {};
    items.forEach((item) => {
      const randomPlayer =
        mappedPlayers[crypto.randomInt(0, mappedPlayers.length)];
      if (randomPlayer) {
        const playerId = `${randomPlayer.characterId}${randomPlayer.accountId}`;
        if (!lootShare[playerId]) {
          lootShare[playerId] = [];
        }
        lootShare[playerId].push(item.hid);
      }
    });

    const location = npc.location ?? "Unknown Location";

    return {
      npcs: [
        {
          id: npc.id,
          wt: npc.wt,
          hpp: npc.hpp,
          lvl: npc.lvl,
          icon: npc.icon,
          name: npc.name,
          prof: getProfByShortname(npc.prof),
          type: getNpcTypeByWt(NpcTypeEnum, npc.wt, npc.prof, npc.type),
          location,
          margonemType: npc.type,
        },
      ],
      loots: items.map((item) => ({
        hid: item.hid,
        id: item.id,
        name: item.name,
        icon: item.icon,
        pr: item.pr,
        prc: item.prc,
        stat: item.stat,
        cl: item.cl,
        rarity: this.getRandomRarity(),
      })),
      players: mappedPlayers,
      lootShare,
      world,
      source,
      location,
    };
  }

  generateMultiple(count: number): GeneratedLoot[] {
    return Array.from({ length: count }, () => this.generate());
  }
}
