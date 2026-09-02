import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";
import {
  CLOCK_PATTERN,
  EVENT_SCORING_ACTION_TYPES,
  EVENT_SCORING_BOOLEAN_FACTORS,
  EVENT_SCORING_NUMERIC_FACTORS,
  EVENT_SCORING_NUMERIC_OPERATORS,
} from "@lootlog/domain/scoring";

const NumericConditionSchema = z
  .object({
    type: z.literal("NUMERIC"),
    factor: z.enum(EVENT_SCORING_NUMERIC_FACTORS),
    operator: z.enum(EVENT_SCORING_NUMERIC_OPERATORS),
    value: z.number(),
  })
  .strict();

const BooleanConditionSchema = z
  .object({
    type: z.literal("BOOLEAN"),
    factor: z.enum(EVENT_SCORING_BOOLEAN_FACTORS),
    value: z.boolean(),
  })
  .strict();

const KillTimeInWindowConditionSchema = z
  .object({
    type: z.literal("KILL_TIME_IN_WINDOW"),
    from: z.string().regex(CLOCK_PATTERN),
    to: z.string().regex(CLOCK_PATTERN),
  })
  .strict();

const RespawnWindowCoverageConditionSchema = z
  .object({
    type: z.literal("RESPAWN_WINDOW_COVERAGE"),
    from: z.string().regex(CLOCK_PATTERN),
    to: z.string().regex(CLOCK_PATTERN),
    operator: z.enum(EVENT_SCORING_NUMERIC_OPERATORS),
    value: z.number(),
  })
  .strict();

const ConditionSchema = z.discriminatedUnion("type", [
  NumericConditionSchema,
  BooleanConditionSchema,
  KillTimeInWindowConditionSchema,
  RespawnWindowCoverageConditionSchema,
]);

const ActionSchema = z.object({
  type: z.enum(EVENT_SCORING_ACTION_TYPES),
  points: z.number().min(0).optional(),
});

const RuleSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  conditions: z.array(ConditionSchema),
  action: ActionSchema,
});

export const EventScoringRulesSchema = z.object({
  version: z.number().min(1).max(1),
  timezone: z.string(),
  hardCapPoints: z.number().min(0),
  minTrackingPercentForBonuses: z.number().min(0).max(100).optional(),
  rules: z.array(RuleSchema),
});

export class EventScoringRulesDto extends createSchemaClass(
  EventScoringRulesSchema,
) {}
