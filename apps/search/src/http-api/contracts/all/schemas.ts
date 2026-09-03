/** Transport schemas owned by the all HTTP module. */
import * as Schema from "effect/Schema";
import { FiniteNumber } from "../scalars.js";

export type SearchAllResponseDto_Output =
  typeof SearchAllResponseDto_Output.Type;

export const SearchAllResponseDto_Output = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      id: FiniteNumber,
      name: Schema.String,
      icon: Schema.String,
      stat: Schema.String.annotate({ default: "" }),
      lvl: FiniteNumber,
      rarity: Schema.Union([Schema.String, Schema.Null]),
      type: Schema.Union([Schema.String, Schema.Null]),
      worlds: Schema.Array(Schema.String).annotate({ default: [] }),
    }).annotate({ description: "Item search hit" }),
  ),
  players: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      lvl: FiniteNumber,
      prof: Schema.String,
      icon: Schema.String,
      characterId: FiniteNumber,
      accountId: FiniteNumber,
      world: Schema.String,
    }).annotate({ description: "Player search hit" }),
  ),
  npcs: Schema.Array(
    Schema.Struct({
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
    }).annotate({ description: "NPC search hit" }),
  ),
}).annotate({
  description: "Aggregated search results",
  identifier: "SearchAllResponseDto_Output",
});

export type AllControllerSearchAllQuery =
  typeof AllControllerSearchAllQuery.Type;

export const AllControllerSearchAllQuery = Schema.Struct({
  limit: Schema.optionalKey(
    Schema.Number.annotate({ default: 10 }).check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  search: Schema.optionalKey(Schema.String),
  world: Schema.optionalKey(Schema.String),
});

export type AllControllerSearchAll200 = typeof AllControllerSearchAll200.Type;

export const AllControllerSearchAll200 = SearchAllResponseDto_Output;
