import { v7 as uuidv7 } from "uuid";
import crypto from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { SCRAPER_CONFIG, SEED_CONFIG } from "../config.js";
import type { GeneratedPlayer } from "./players-generator.js";

interface NpcData {
  icon: string;
  id: number;
  prof: string;
  hpp: number;
  type: number;
  wt: number;
  lvl: number;
  name: string;
  location?: string;
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
  npcs: Array<NpcData & { location: string }>;
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
    id: number;
    name: string;
    lvl: number;
    prof: string;
    icon: string;
    accountId: number;
    hpp: number;
  }>;
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
      result.push({
        ...item,
        hid: uuidv7(),
      });
    }
    return result;
  }

  private getRandomNpc(): NpcData {
    return this.npcs[crypto.randomInt(0, this.npcs.length)];
  }

  private getRandomPlayers(count: number): GeneratedPlayer[] {
    const result: GeneratedPlayer[] = [];
    for (let i = 0; i < count; i++) {
      result.push(this.players[crypto.randomInt(0, this.players.length)]);
    }
    return result;
  }

  private getRandomRarity(): ItemRarity {
    const rarities: ItemRarity[] = [
      "UNIQUE",
      "HEROIC",
      "LEGENDARY",
      "UPGRADED",
    ];
    const weights = [50, 30, 15, 5]; // UNIQUE 50%, HEROIC 30%, LEGENDARY 15%, UPGRADED 5%

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = crypto.randomInt(0, totalWeight);

    let cumulativeWeight = 0;
    for (let i = 0; i < rarities.length; i++) {
      cumulativeWeight += weights[i];
      if (random < cumulativeWeight) {
        return rarities[i];
      }
    }

    return "UNIQUE"; // fallback
  }

  generate(): GeneratedLoot {
    const { worlds, lootSources } = SCRAPER_CONFIG;
    const { itemsPerLoot, playersPerLoot } = SEED_CONFIG.loots;

    const source = lootSources[crypto.randomInt(0, lootSources.length)];
    const world = worlds[crypto.randomInt(0, worlds.length)];

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

    return {
      npcs: [{ ...npc, location: npc.location ?? "Unknown Location" }],
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
      players: players.map((player) => ({
        id: player.originalId,
        name: player.name,
        lvl: player.lvl,
        prof: player.prof,
        icon: player.icon,
        accountId: player.originalId,
        hpp: crypto.randomInt(0, 101),
      })),
      world,
      source,
      location: npc.location ?? "Unknown Location",
    };
  }

  generateMultiple(count: number): GeneratedLoot[] {
    return Array.from({ length: count }, () => this.generate());
  }
}
