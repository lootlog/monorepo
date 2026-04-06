import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { EventScoringRulesSchema } from "./event-scoring-rules.dto";
import { EVENT_SCORING_MODES } from "../constants/scoring-rules.constant";

export const HeroMapSchema = z.object({
  mapId: z.number().int(),
  mapName: z.string(),
});

export class HeroMapDto extends createZodDto(HeroMapSchema) {}

export const HeroNpcSchema = z.object({
  npcId: z.number().int().optional(),
  npcName: z.string(),
  maps: z.array(HeroMapSchema),
});

export class HeroNpcDto extends createZodDto(HeroNpcSchema) {}

const CreateEventSchema = z
  .object({
    name: z.string(),
    world: z.string(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    basePointsPerKill: z.number().int().min(0).optional(),
    assignmentTimeoutMinutes: z.number().int().min(0).optional(),
    participationConfirmationMinutes: z.number().int().min(0).optional(),
    mapAssignmentCap: z.number().int().min(0).optional(),
    rulebookMarkdown: z.string().max(10_000).optional(),
    scoringRules: EventScoringRulesSchema.optional(),
    scoringMode: z.enum(EVENT_SCORING_MODES).optional(),
    heroNpcs: z.array(HeroNpcSchema).optional(),
  })
  .refine(
    (data) =>
      !data.startsAt ||
      !data.endsAt ||
      Date.parse(data.endsAt) >= Date.parse(data.startsAt),
    { message: "endsAt must not be before startsAt", path: ["endsAt"] },
  );

export class CreateEventDto extends createZodDto(CreateEventSchema) {}
