import { IsoDateTime } from "@lootlog/schema/primitives";
import { LootSnapshot } from "@lootlog/protocol/loot-summary";
import { Schema } from "effect";

export type LootShare = Record<string, string[]>;

// The realtime snapshot carries this response in its encoded form.
export const LootResponse = Schema.Struct({
  ...LootSnapshot.fields,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

export type LootResponse = typeof LootResponse.Type;

export const NullableLootResponse = Schema.NullOr(LootResponse);
