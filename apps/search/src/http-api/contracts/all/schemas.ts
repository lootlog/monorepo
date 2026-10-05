/** Transport schemas owned by the all HTTP module. */
import * as Schema from "effect/Schema";
import { FiniteNumber } from "@lootlog/schema/http-scalars";
import { ItemHit } from "../items/schemas.js";
import { PlayerHitDto_Output } from "../players/schemas.js";
import { NpcHitDto_Output } from "../npcs/schemas.js";

export type SearchAllResponseDto_Output =
  typeof SearchAllResponseDto_Output.Type;

export const SearchAllResponseDto_Output = Schema.Struct({
  items: Schema.Array(ItemHit),
  players: Schema.Array(
    Schema.Struct(PlayerHitDto_Output.fields).annotate({
      description: "Player search hit",
    }),
  ),
  npcs: Schema.Array(
    Schema.Struct(NpcHitDto_Output.fields).annotate({
      description: "NPC search hit",
    }),
  ),
}).annotate({
  description: "Aggregated search results",
  identifier: "SearchAllResponseDto_Output",
});

export type AllControllerSearchAllQuery =
  typeof AllControllerSearchAllQuery.Type;

export const AllControllerSearchAllQuery = Schema.Struct({
  limit: Schema.optionalKey(FiniteNumber.annotate({ default: 10 })),
  search: Schema.optionalKey(Schema.String),
  // Filters players only; NPCs and items are shared by every world of an
  // edition.
  world: Schema.optionalKey(Schema.String),
});

export type AllControllerSearchAll200 = typeof AllControllerSearchAll200.Type;

export const AllControllerSearchAll200 = SearchAllResponseDto_Output;
