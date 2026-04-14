import crypto from "node:crypto";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type BattlePayload = {
  accountId: string;
  characterId: string;
  world: string;
  events: any[];
};

export class BattlesGenerator {
  private samplePayload: BattlePayload | null = null;

  async initialize() {
    const samplePath = path.join(
      __dirname,
      "../../../../../../example-data/sample-battlelog-payload.json",
    );
    const sampleData = await readFile(samplePath, "utf-8");
    this.samplePayload = JSON.parse(sampleData);
  }

  generateSingle(characterId: string, accountId: string): BattlePayload {
    if (!this.samplePayload) {
      throw new Error("BattlesGenerator not initialized");
    }

    const worlds = ["gordion", "classic", "katahha", "aldous", "gefion"];
    const randomWorld = worlds[crypto.randomInt(worlds.length)];

    return {
      accountId,
      characterId,
      world: randomWorld ?? "gordion",
      events: this.samplePayload.events,
    };
  }

  generateMultiple(
    count: number,
    characterId: string,
    accountId: string,
  ): BattlePayload[] {
    const battles: BattlePayload[] = [];

    for (let i = 0; i < count; i++) {
      battles.push(this.generateSingle(characterId, accountId));
    }

    return battles;
  }
}
