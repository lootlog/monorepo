import { Schema } from "effect";
import { CreateBattleSchema } from "#src/battles/submission/create-battle";

type BattleEvents = (typeof CreateBattleSchema.Type)["events"];

const decodeEvents = Schema.decodeUnknownSync(CreateBattleSchema.fields.events);

export const encodeBattleEvents = (events: ReadonlyArray<unknown>) =>
  Bun.zstdCompressSync(Buffer.from(JSON.stringify(events)), { level: 3 });

export const decodeBattleEvents = (stored: Uint8Array): BattleEvents =>
  decodeEvents(
    JSON.parse(Buffer.from(Bun.zstdDecompressSync(stored)).toString("utf8")),
  );
