/** creation transport definitions for battles. */
import * as Schema from "effect/Schema";

export type CreateBattleDto = {
  readonly accountId: string;
  readonly characterId: string;
  readonly submissionId?: string;
  readonly world: string;
  readonly matchmaking?: boolean;
  readonly events: ReadonlyArray<{
    readonly party?: {
      readonly members: {
        readonly [x: string]: {
          readonly id: number;
          readonly account: number;
          readonly nick: string;
          readonly icon: string;
          readonly commander?: number;
        };
      };
    };
    readonly f: {
      readonly m?: ReadonlyArray<string>;
      readonly endBattle?: number;
      readonly init?: string;
      readonly auto?: string;
      readonly w?: {
        readonly [x: string]: {
          readonly originalId: number;
          readonly name: string;
          readonly lvl: number;
          readonly prof: string;
          readonly icon: string;
          readonly team: number;
        };
      };
    };
    readonly ev?: number;
    readonly match_summary?: {
      readonly difficulty_rank: number;
      readonly result: number;
      readonly rating_delta: number;
      readonly opponent_lvl: number;
      readonly opponent_oplvl: number;
      readonly opponent_rating: number;
      readonly rating: number;
      readonly status: number;
      readonly placement_cur?: number;
      readonly placement_max?: number;
      readonly points_gained?: number;
      readonly daily_stage?: {
        readonly id: number;
        readonly points_cur: number;
        readonly points_max: number;
        readonly points_step: number;
        readonly rewards_last: number;
        readonly rewards_cur: number;
        readonly rewards_max: number;
      };
    };
    readonly matchmaking_state?: number;
  }>;
};

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
              id: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              account: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              nick: Schema.String,
              icon: Schema.String,
              commander: Schema.optionalKey(
                Schema.Number.check(
                  Schema.isFinite().annotate({ expected: "a finite number" }),
                ),
              ),
            }),
          ),
        }),
      ),
      f: Schema.Struct({
        m: Schema.optionalKey(Schema.Array(Schema.String)),
        endBattle: Schema.optionalKey(
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        ),
        init: Schema.optionalKey(Schema.String),
        auto: Schema.optionalKey(Schema.String),
        w: Schema.optionalKey(
          Schema.Record(
            Schema.String,
            Schema.Struct({
              originalId: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              name: Schema.String,
              lvl: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              prof: Schema.String,
              icon: Schema.String,
              team: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
            }),
          ),
        ),
      }),
      ev: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      match_summary: Schema.optionalKey(
        Schema.Struct({
          difficulty_rank: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          result: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          rating_delta: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          opponent_lvl: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          opponent_oplvl: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          opponent_rating: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          rating: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          status: Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
          placement_cur: Schema.optionalKey(
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
          ),
          placement_max: Schema.optionalKey(
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
          ),
          points_gained: Schema.optionalKey(
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
          ),
          daily_stage: Schema.optionalKey(
            Schema.Struct({
              id: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              points_cur: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              points_max: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              points_step: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              rewards_last: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              rewards_cur: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
              rewards_max: Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
            }),
          ),
        }),
      ),
      matchmaking_state: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
    }),
  ).check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
}).annotate({ identifier: "CreateBattleDto" });

export type BattleCreatedResponseDto_Output = { readonly battleId: string };

export const BattleCreatedResponseDto_Output = Schema.Struct({
  battleId: Schema.String,
}).annotate({ identifier: "BattleCreatedResponseDto_Output" });
