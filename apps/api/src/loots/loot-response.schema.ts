import { IsoDateTime } from "@lootlog/schema/primitives";
import { LootSnapshot } from "@lootlog/protocol/loot-summary";
import { Schema } from "effect";
import { LootSubmission } from "#src/contracts/loots/schemas";
import { MemberSummary } from "#src/contracts/shared";

export type LootShare = Record<string, string[]>;

// The realtime snapshot carries this response in its encoded form.
export const LootResponse = Schema.Struct({
  ...LootSnapshot.fields,
  submissions: Schema.optionalKey(Schema.Array(LootSubmission)),
  likes: Schema.Array(MemberSummary),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

export type LootResponse = typeof LootResponse.Type;

export const NullableLootResponse = Schema.NullOr(LootResponse);
