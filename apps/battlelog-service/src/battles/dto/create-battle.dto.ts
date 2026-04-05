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

export const CreateBattleFightEventWarriorSchema = z.object({
  originalId: z.number(),
  name: z.string(),
  lvl: z.number(),
  prof: z.string(),
  icon: z.string(),
  team: z.number(),
});

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

const CreateBattleFightEventSchema = z.object({
  m: z.array(z.string()).optional(),
  endBattle: z.number().optional(),
  init: z.string().optional(),
  auto: z.string().optional(),
  w: WarriorsRecordSchema.optional(),
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
});

const CreateBattleEventsSchema = z.object({
  party: CreateBattlePartyEventSchema.optional(),
  f: CreateBattleFightEventSchema,
  ev: z.number(),
  match_summary: CreateBattleMatchSummarySchema.optional(),
});

const CreateBattleSchema = z.object({
  accountId: z.string(),
  characterId: z.string(),
  world: z.string(),
  matchmaking: z.boolean().optional(),
  events: z.array(CreateBattleEventsSchema).min(1),
});

export class CreateBattleDto extends createZodDto(CreateBattleSchema) {}
