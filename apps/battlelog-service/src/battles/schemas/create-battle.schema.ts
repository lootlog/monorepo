import { z } from "@hono/zod-openapi";

const createBattlePartyMembersEventSchema = z.object({
  id: z.number(),
  account: z.number(),
  nick: z.string(),
  icon: z.string(),
  commander: z.number().optional(),
});

const createBattlePartyEventSchema = z.object({
  members: z.record(z.string(), createBattlePartyMembersEventSchema),
});

const createBattleFightEventWarriorSchema = z.object({
  originalId: z.number(),
  name: z.string(),
  lvl: z.number(),
  prof: z.string(),
  icon: z.string(),
  team: z.number(),
});

export const warriorsRecordSchema = z
  .record(z.string(), createBattleFightEventWarriorSchema)
  .refine(
    (record) => {
      const entries = Object.entries(record);
      if (entries.length === 0) {
        return false;
      }
      if (entries.some(([key]) => key.startsWith("-"))) {
        return false;
      }
      const teams = new Set(
        entries.map(([, warrior]) => warrior.team as number),
      );
      return teams.size > 1;
    },
    { message: "w must be a valid Record of warriors" },
  );

export const WarriorsRecordSchema = warriorsRecordSchema;

const createBattleFightEventSchema = z.object({
  m: z.array(z.string()).optional(),
  endBattle: z.number().optional(),
  init: z.string().optional(),
  auto: z.string().optional(),
  w: warriorsRecordSchema.optional(),
});

const createBattleMatchSummarySchema = z.object({
  difficulty_rank: z.number(),
  result: z.number(),
  rating_delta: z.number(),
  opponent_lvl: z.number(),
  opponent_oplvl: z.number(),
  opponent_rating: z.number(),
  rating: z.number(),
  status: z.number(),
});

const createBattleEventsSchema = z.object({
  party: createBattlePartyEventSchema.optional(),
  f: createBattleFightEventSchema,
  ev: z.number(),
  match_summary: createBattleMatchSummarySchema.optional(),
});

export const createBattleSchema = z.object({
  accountId: z.string(),
  characterId: z.string(),
  world: z.string(),
  matchmaking: z.boolean().optional(),
  events: z.array(createBattleEventsSchema).min(1),
});

export type CreateBattleInput = z.infer<typeof createBattleSchema>;
