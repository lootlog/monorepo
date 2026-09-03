/** Transport schemas owned by the players HTTP module. */
import * as Schema from "effect/Schema";

export type PlayerHitDto_Output = {
  readonly id: string;
  readonly name: string;
  readonly lvl: number;
  readonly prof: string;
  readonly icon: string;
  readonly characterId: number;
  readonly accountId: number;
  readonly world: string;
};

export const PlayerHitDto_Output = Schema.Struct({
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
}).annotate({
  description: "Player search hit",
  identifier: "PlayerHitDto_Output",
});

export type PlayersControllerGetPlayersQuery = {
  readonly limit?: number;
  readonly search?: string | ReadonlyArray<string>;
  readonly world?: string;
};

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

export type PlayersControllerGetPlayers200 = ReadonlyArray<PlayerHitDto_Output>;

export const PlayersControllerGetPlayers200 = Schema.Array(PlayerHitDto_Output);
