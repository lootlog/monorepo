/** Transport schemas owned by the npcs HTTP module. */
import * as Schema from "effect/Schema";
import { FiniteNumber } from "../scalars.js";

export type NpcHitDto_Output = typeof NpcHitDto_Output.Type;

export const NpcHitDto_Output = Schema.Struct({
  id: FiniteNumber,
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
  world: Schema.String,
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
  world: Schema.optionalKey(Schema.String),
});

export type NpcsControllerGetNpcs200 = typeof NpcsControllerGetNpcs200.Type;

export const NpcsControllerGetNpcs200 = Schema.Array(NpcHitDto_Output);
