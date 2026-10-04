import { Schema } from "effect";
import { CreateBattleSchema } from "#src/battles/submission/create-battle";

// A battle timeline is the Margonem events the client submitted. The parsed
// moves and the timeline are derived from them when the battle is read.
// zstd-compressed JSON is about a third smaller than jsonb with TOAST.

type BattleEvents = (typeof CreateBattleSchema.Type)["events"];

const decodeEvents = Schema.decodeUnknownSync(CreateBattleSchema.fields.events);

// Reading validates the stored events, so any submitted array encodes.
export const encodeBattleEvents = (events: ReadonlyArray<unknown>) =>
  Bun.zstdCompressSync(Buffer.from(JSON.stringify(events)), { level: 3 });

export const decodeBattleEvents = (stored: Uint8Array): BattleEvents =>
  decodeEvents(
    JSON.parse(Buffer.from(Bun.zstdDecompressSync(stored)).toString("utf8")),
  );
