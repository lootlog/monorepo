/** creation transport definitions for battles. */
import * as Schema from "effect/Schema";
import { FiniteNumber } from "../scalars.js";

export type CreateBattleDto = typeof CreateBattleDto.Type;

export const CreateBattleDto = Schema.Struct({
  accountId: Schema.String,
  characterId: Schema.String,
  submissionId: Schema.optionalKey(
    Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(128).annotate({
        expected: "a value with a length of at most 128",
      }),
    ),
  ),
  world: Schema.String,
  matchmaking: Schema.optionalKey(Schema.Boolean),
  events: Schema.Array(
    Schema.Struct({
      party: Schema.optionalKey(
        Schema.Struct({
          members: Schema.Record(
            Schema.String,
            Schema.Struct({
              id: FiniteNumber,
              account: FiniteNumber,
              nick: Schema.String,
              icon: Schema.String,
              commander: Schema.optionalKey(FiniteNumber),
            }),
          ),
        }),
      ),
      f: Schema.Struct({
        m: Schema.optionalKey(Schema.Array(Schema.String)),
        endBattle: Schema.optionalKey(FiniteNumber),
        init: Schema.optionalKey(Schema.String),
        auto: Schema.optionalKey(Schema.String),
        w: Schema.optionalKey(
          Schema.Record(
            Schema.String,
            Schema.Struct({
              originalId: FiniteNumber,
              name: Schema.String,
              lvl: FiniteNumber,
              prof: Schema.String,
              icon: Schema.String,
              team: FiniteNumber,
            }),
          ),
        ),
      }),
      ev: Schema.optionalKey(FiniteNumber),
      match_summary: Schema.optionalKey(
        Schema.Struct({
          difficulty_rank: FiniteNumber,
          result: FiniteNumber,
          rating_delta: FiniteNumber,
          opponent_lvl: FiniteNumber,
          opponent_oplvl: FiniteNumber,
          opponent_rating: FiniteNumber,
          rating: FiniteNumber,
          status: FiniteNumber,
          placement_cur: Schema.optionalKey(FiniteNumber),
          placement_max: Schema.optionalKey(FiniteNumber),
          points_gained: Schema.optionalKey(FiniteNumber),
          daily_stage: Schema.optionalKey(
            Schema.Struct({
              id: FiniteNumber,
              points_cur: FiniteNumber,
              points_max: FiniteNumber,
              points_step: FiniteNumber,
              rewards_last: FiniteNumber,
              rewards_cur: FiniteNumber,
              rewards_max: FiniteNumber,
            }),
          ),
        }),
      ),
      matchmaking_state: Schema.optionalKey(FiniteNumber),
    }),
  ).check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
}).annotate({ identifier: "CreateBattleDto" });

export type BattleCreatedResponseDto_Output =
  typeof BattleCreatedResponseDto_Output.Type;

export const BattleCreatedResponseDto_Output = Schema.Struct({
  battleId: Schema.String,
}).annotate({ identifier: "BattleCreatedResponseDto_Output" });
