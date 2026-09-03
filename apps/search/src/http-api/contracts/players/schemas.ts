/** Transport schemas owned by the players HTTP module. */
import * as Schema from "effect/Schema";
import { FiniteNumber } from "../scalars.js";

export type PlayerHitDto_Output = typeof PlayerHitDto_Output.Type;

export const PlayerHitDto_Output = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  lvl: FiniteNumber,
  prof: Schema.String,
  icon: Schema.String,
  characterId: FiniteNumber,
  accountId: FiniteNumber,
  world: Schema.String,
}).annotate({
  description: "Player search hit",
  identifier: "PlayerHitDto_Output",
});

export type PlayersControllerGetPlayersQuery =
  typeof PlayersControllerGetPlayersQuery.Type;

export const PlayersControllerGetPlayersQuery = Schema.Struct({
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

export type PlayersControllerGetPlayers200 =
  typeof PlayersControllerGetPlayers200.Type;

export const PlayersControllerGetPlayers200 = Schema.Array(PlayerHitDto_Output);
