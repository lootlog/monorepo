/** Transport schemas owned by the all HTTP module. */
import * as Schema from "effect/Schema";

export type SearchAllResponseDto_Output = {
  readonly items: ReadonlyArray<{
    readonly id: number;
    readonly name: string;
    readonly icon: string;
    readonly stat: string;
    readonly lvl: number;
    readonly rarity: string | null;
    readonly type: string | null;
    readonly worlds: ReadonlyArray<string>;
  }>;
  readonly players: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly lvl: number;
    readonly prof: string;
    readonly icon: string;
    readonly characterId: number;
    readonly accountId: number;
    readonly world: string;
  }>;
  readonly npcs: ReadonlyArray<{
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
  }>;
};

export const SearchAllResponseDto_Output = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      id: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      name: Schema.String,
      icon: Schema.String,
      stat: Schema.String.annotate({ default: "" }),
      lvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      rarity: Schema.Union([Schema.String, Schema.Null]),
      type: Schema.Union([Schema.String, Schema.Null]),
      worlds: Schema.Array(Schema.String).annotate({ default: [] }),
    }).annotate({ description: "Item search hit" }),
  ),
  players: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      lvl: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      prof: Schema.String,
      icon: Schema.String,
      characterId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      accountId: Schema.Number.check(
        Schema.isFinite().annotate({ expected: "a finite number" }),
      ),
      world: Schema.String,
    }).annotate({ description: "Player search hit" }),
  ),
  npcs: Schema.Array(
    Schema.Struct({
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
    }).annotate({ description: "NPC search hit" }),
  ),
}).annotate({
  description: "Aggregated search results",
  identifier: "SearchAllResponseDto_Output",
});

export type AllControllerSearchAllQuery = {
  readonly limit?: number;
  readonly search?: string;
  readonly world?: string;
};

export const AllControllerSearchAllQuery = Schema.Struct({
  limit: Schema.optionalKey(
    Schema.Number.annotate({ default: 10 }).check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  search: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
});

export type AllControllerSearchAll200 = SearchAllResponseDto_Output;

export const AllControllerSearchAll200 = SearchAllResponseDto_Output;
