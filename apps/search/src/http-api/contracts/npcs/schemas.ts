/** Transport schemas owned by the npcs HTTP module. */
import * as Schema from "effect/Schema";
import { FiniteNumber } from "@lootlog/schema/http-scalars";

export type NpcHitDto_Output = typeof NpcHitDto_Output.Type;

export const NpcHitDto_Output = Schema.Struct({
  id: FiniteNumber,
  identityNamespace: Schema.Literals([
    "legacy",
    "runtime",
    "template",
  ]).annotate({
    description:
      "Meaning of `id`: a Margonem template id, a runtime spawn id observed without a template, or an overloaded legacy id.",
  }),
  prof: Schema.String,
  icon: Schema.String,
  name: Schema.String,
  lvl: FiniteNumber,
  wt: FiniteNumber,
  type: Schema.Literals([
    "COMMON",
    "ELITE",
    "ELITE2",
    "ELITE3",
    "HERO",
    "EVENT_HERO",
    "COLOSSUS",
    "TITAN",
    "NPC",
  ]),
  margonemType: FiniteNumber,
  world: Schema.String.annotate({
    description:
      "Deprecated: the world of the latest observation. Use `worlds`.",
  }),
  worlds: Schema.Array(Schema.String).annotate({
    description: "Worlds of the edition where this NPC was observed.",
    default: [],
  }),
  gameVersion: Schema.NullOr(Schema.Literals(["en", "pl"])).annotate({
    description:
      "Margonem edition of the NPC: `pl` for margonem.pl, `en` for margonem.com. Equal ids in different editions are unrelated. Always set; the field stays nullable for compatibility.",
  }),
}).annotate({ description: "NPC search hit", identifier: "NpcHitDto_Output" });

export type NpcsControllerGetNpcsQuery = typeof NpcsControllerGetNpcsQuery.Type;

export const NpcsControllerGetNpcsQuery = Schema.Struct({
  ids: Schema.optionalKey(
    Schema.Array(
      Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
        .check(
          Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
            expected: "a value greater than or equal to -9007199254740991",
          }),
        )
        .check(
          Schema.isLessThanOrEqualTo(9007199254740991).annotate({
            expected: "a value less than or equal to 9007199254740991",
          }),
        ),
    ),
  ),
  limit: Schema.optionalKey(
    Schema.Number.annotate({ default: 10 }).check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  search: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Array(Schema.String)]),
  ),
  world: Schema.optionalKey(
    Schema.String.annotate({
      description:
        "Deprecated and ignored: every world of an edition shares its NPC and item ids. Accepted for older callers; it will be removed in a breaking release.",
    }),
  ),
});

export type NpcsControllerGetNpcs200 = typeof NpcsControllerGetNpcs200.Type;

export const NpcsControllerGetNpcs200 = Schema.Array(NpcHitDto_Output);
