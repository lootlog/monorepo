import type { InflatedBattleWarrior } from "#src/battles/statistics/battle-warrior-stats";
import type { Battle } from "#src/database/schema";
import {
  CreateBattleSchema,
  type CreateBattleInput,
} from "#src/battles/submission/create-battle";
import { Schema } from "effect";
import type { PaginationResult } from "#src/battles/analytics/pagination";

// Complete battle with all relations
export interface BattleWithRelations extends Battle {
  warriors: InflatedBattleWarrior[];
}

// Service method parameters
export interface CreateBattleParams {
  data: CreateBattleInput;
  userId: string;
}

// Service method return types
export interface CreateBattleResult {
  battleId: string;
}

export interface GetAllBattlesResult {
  battles: BattleWithRelations[];
  pagination: PaginationResult<BattleWithRelations>["pagination"];
  meta: {
    performance: PaginationResult<BattleWithRelations>["performance"];
  };
}

export interface DeleteBattleResult {
  message: string;
}

// Raw battle data structure stored in R2
const ParsedMoveSchema = Schema.Struct({
  attackerId: Schema.NullOr(Schema.String),
  defenderId: Schema.NullOr(Schema.String),
  attackerHpPercentage: Schema.NullOr(Schema.Number),
  defenderHpPercentage: Schema.NullOr(Schema.Number),
  actions: Schema.mutable(
    Schema.Array(
      Schema.Struct({ actionType: Schema.String, param: Schema.String }),
    ),
  ),
});

export const RawBattleDataSchema = Schema.Struct({
  battleId: Schema.String,
  timestamp: Schema.String,
  rawData: Schema.Struct({
    accountId: CreateBattleSchema.fields.accountId,
    characterId: CreateBattleSchema.fields.characterId,
    submissionId: CreateBattleSchema.fields.submissionId,
    world: CreateBattleSchema.fields.world,
    matchmaking: CreateBattleSchema.fields.matchmaking,
    events: Schema.mutable(Schema.Array(ParsedMoveSchema)),
    sourceEvents: Schema.optional(
      Schema.mutable(CreateBattleSchema.fields.events),
    ),
  }),
});
export type RawBattleData = typeof RawBattleDataSchema.Type;
export const decodeRawBattleDataJson = Schema.decodeUnknownSync(
  Schema.fromJsonString(RawBattleDataSchema),
);
