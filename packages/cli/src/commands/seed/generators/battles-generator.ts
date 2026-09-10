import type { BattlePayload } from "@lootlog/battle-processor";
import { Schema } from "effect";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const WarriorSnapshot = Schema.Struct({
  originalId: Schema.Number,
  name: Schema.String,
  lvl: Schema.Number,
  prof: Schema.String,
  icon: Schema.String,
  team: Schema.Number,
});

const SampleBattle = Schema.Struct({
  accountId: Schema.String,
  characterId: Schema.String,
  world: Schema.String,
  events: Schema.mutable(
    Schema.Array(
      Schema.Struct({
        ev: Schema.optionalKey(Schema.Number),
        f: Schema.optionalKey(
          Schema.Struct({
            m: Schema.optionalKey(Schema.mutable(Schema.Array(Schema.String))),
            w: Schema.optionalKey(
              Schema.Record(Schema.String, WarriorSnapshot),
            ),
          }),
        ),
        match_summary: Schema.optionalKey(
          Schema.Struct({
            difficulty_rank: Schema.Number,
            result: Schema.Number,
            rating_delta: Schema.Number,
            opponent_lvl: Schema.Number,
            opponent_oplvl: Schema.Number,
            opponent_rating: Schema.Number,
            rating: Schema.Number,
            status: Schema.Number,
            placement_cur: Schema.optionalKey(Schema.Number),
            placement_max: Schema.optionalKey(Schema.Number),
            points_gained: Schema.optionalKey(Schema.Number),
            daily_stage: Schema.optionalKey(
              Schema.Struct({
                id: Schema.Number,
                points_cur: Schema.Number,
                points_max: Schema.Number,
                points_step: Schema.Number,
                rewards_last: Schema.Number,
                rewards_cur: Schema.Number,
                rewards_max: Schema.Number,
              }),
            ),
          }),
        ),
      }),
    ),
  ),
});

export const parseSampleBattle = Schema.decodeUnknownSync(
  Schema.fromJsonString(SampleBattle),
  { onExcessProperty: "preserve" },
);

export class BattlesGenerator {
  private samplePayload: BattlePayload | null = null;

  async initialize() {
    const samplePath = path.join(
      __dirname,
      "../../../../../../example-data/sample-battlelog-payload.json",
    );

    const sampleData = await readFile(samplePath, "utf-8");
    this.samplePayload = parseSampleBattle(sampleData);
  }

  generateSingle(characterId: string, accountId: string): BattlePayload {
    if (!this.samplePayload) {
      throw new Error("BattlesGenerator not initialized");
    }

    const worlds = ["gordion", "classic", "katahha", "aldous", "gefion"];
    const randomWorld = worlds[Math.floor(Math.random() * worlds.length)];

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
