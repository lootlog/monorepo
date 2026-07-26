import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const CreateBattlePartyMembersEventSchema = z.object({
  id: z.number(),
  account: z.number(),
  nick: z.string(),
  icon: z.string(),
  commander: z.number().optional(),
});

const CreateBattlePartyEventSchema = z.object({
  members: z.record(z.string(), CreateBattlePartyMembersEventSchema),
});

const CreateBattleFightEventWarriorSchema = z.object({
  originalId: z.number(),
  name: z.string(),
  lvl: z.number(),
  prof: z.string(),
  icon: z.string(),
  team: z.number(),
});

const requiredWarriorSnapshotFields = [
  "originalId",
  "name",
  "lvl",
  "prof",
  "icon",
  "team",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasCompleteWarriorSnapshotShape = (value: unknown): boolean =>
  isRecord(value) &&
  requiredWarriorSnapshotFields.every((field) => field in value);

const removeIncompleteWarriorSnapshots = (value: unknown): unknown => {
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).filter(([, warrior]) =>
      hasCompleteWarriorSnapshotShape(warrior),
    ),
  );
};

export const WarriorsRecordSchema = z
  .record(z.string(), CreateBattleFightEventWarriorSchema)
  .refine(
    (record) => {
      const entries = Object.entries(record);
      if (entries.length === 0) return false;
      if (entries.some(([key]) => key.startsWith("-"))) return false;
      const teams = new Set(entries.map(([, w]) => w.team));
      return teams.size > 1;
    },
    { message: "w must be a valid Record of warriors" },
  );

const OptionalWarriorsRecordSchema = z.preprocess((value) => {
  const warriors = removeIncompleteWarriorSnapshots(value);
  if (!isRecord(warriors)) return warriors;

  return Object.keys(warriors).length > 0 ? warriors : undefined;
}, WarriorsRecordSchema.optional());

const CreateBattleFightEventSchema = z.object({
  m: z.array(z.string()).optional(),
  endBattle: z.number().optional(),
  init: z.string().optional(),
  auto: z.string().optional(),
  w: OptionalWarriorsRecordSchema.optional(),
});

const CreateBattleMatchSummarySchema = z.object({
  difficulty_rank: z.number(),
  result: z.number(),
  rating_delta: z.number(),
  opponent_lvl: z.number(),
  opponent_oplvl: z.number(),
  opponent_rating: z.number(),
  rating: z.number(),
  status: z.number(),
  placement_cur: z.number().optional(),
  placement_max: z.number().optional(),
  points_gained: z.number().optional(),
  daily_stage: z
    .object({
      id: z.number(),
      points_cur: z.number(),
      points_max: z.number(),
      points_step: z.number(),
      rewards_last: z.number(),
      rewards_cur: z.number(),
      rewards_max: z.number(),
    })
    .optional(),
});

const CreateBattleEventsSchema = z.object({
  party: CreateBattlePartyEventSchema.optional(),
  f: CreateBattleFightEventSchema,
  ev: z.number().optional(),
  match_summary: CreateBattleMatchSummarySchema.optional(),
  matchmaking_state: z.number().optional(),
});

export const CreateBattleSchema = z.object({
  accountId: z.string(),
  characterId: z.string(),
  submissionId: z.string().min(1).max(128).optional(),
  world: z.string(),
  matchmaking: z.boolean().optional(),
  events: z.array(CreateBattleEventsSchema).min(1),
});

export class CreateBattleDto extends createZodDto(CreateBattleSchema) {}
