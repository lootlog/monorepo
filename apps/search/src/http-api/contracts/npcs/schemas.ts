/** Transport schemas owned by the npcs HTTP module. */
import * as Schema from "effect/Schema";

export type NpcHitDto_Output = {
  readonly id: number;
  readonly prof: string;
  readonly icon: string;
  readonly name: string;
  readonly lvl: number;
  readonly wt: number;
  readonly type:
    | "COMMON"
    | "ELITE"
    | "ELITE2"
    | "ELITE3"
    | "HERO"
    | "EVENT_HERO"
    | "COLOSSUS"
    | "TITAN"
    | "NPC";
  readonly margonemType: number;
  readonly world: string;
};

export const NpcHitDto_Output = Schema.Struct({
  id: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  prof: Schema.String,
  icon: Schema.String,
  name: Schema.String,
  lvl: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  wt: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
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
  margonemType: Schema.Number.check(
    Schema.isFinite().annotate({ expected: "a finite number" }),
  ),
  world: Schema.String,
}).annotate({ description: "NPC search hit", identifier: "NpcHitDto_Output" });

export type NpcsControllerGetNpcsQuery = {
  readonly ids?: ReadonlyArray<number>;
  readonly limit?: number;
  readonly search?: string | ReadonlyArray<string>;
  readonly world?: string;
};

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

export type NpcsControllerGetNpcs200 = ReadonlyArray<NpcHitDto_Output>;

export const NpcsControllerGetNpcs200 = Schema.Array(NpcHitDto_Output);
