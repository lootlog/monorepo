/** Transport schemas owned by the npcs HTTP module. */
import * as Schema from "effect/Schema";
import { GameVersionSchema } from "@lootlog/schema/game-version";
import { FiniteNumber, SafeInteger } from "@lootlog/schema/http-scalars";
import { NpcIdentityNamespaceSchema } from "@lootlog/schema/npc-identity";
import { NpcTypeSchema } from "@lootlog/schema/npc-type";

export type NpcHitDto_Output = typeof NpcHitDto_Output.Type;

export const NpcHitDto_Output = Schema.Struct({
  id: FiniteNumber,
  identityNamespace: NpcIdentityNamespaceSchema.annotate({
    description:
      "Meaning of `id`: a Margonem template id, a runtime spawn id observed without a template, or an overloaded legacy id.",
  }),
  prof: Schema.String,
  icon: Schema.String,
  name: Schema.String,
  lvl: FiniteNumber,
  wt: FiniteNumber,
  type: NpcTypeSchema,
  margonemType: FiniteNumber,
  worlds: Schema.Array(Schema.String).annotate({
    description: "Worlds of the edition where this NPC was observed.",
    default: [],
  }),
  gameVersion: GameVersionSchema.annotate({
    description:
      "Margonem edition of the NPC: `pl` for margonem.pl, `en` for margonem.com. Equal ids in different editions are unrelated.",
  }),
}).annotate({ description: "NPC search hit", identifier: "NpcHitDto_Output" });

export type NpcsControllerGetNpcsQuery = typeof NpcsControllerGetNpcsQuery.Type;

export const NpcsControllerGetNpcsQuery = Schema.Struct({
  ids: Schema.optionalKey(Schema.Array(SafeInteger)),
  limit: Schema.optionalKey(FiniteNumber.annotate({ default: 10 })),
  search: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Array(Schema.String)]),
  ),
});

export type NpcsControllerGetNpcs200 = typeof NpcsControllerGetNpcs200.Type;

export const NpcsControllerGetNpcs200 = Schema.Array(NpcHitDto_Output);
