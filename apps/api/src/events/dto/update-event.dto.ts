import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { HeroNpcSchema } from "./create-event.dto";
import { EventScoringRulesSchema } from "./event-scoring-rules.dto";
import { EVENT_SCORING_MODES } from "../constants/scoring-rules.constant";

const UpdateEventSchema = z.object({
  name: z.string().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  heroNpcs: z.array(HeroNpcSchema).optional(),
  basePointsPerKill: z.number().int().min(0).optional(),
  assignmentTimeoutMinutes: z.number().int().min(0).optional(),
  participationConfirmationMinutes: z.number().int().min(0).optional(),
  mapAssignmentCap: z.number().int().min(0).optional(),
  rulebookMarkdown: z.string().max(10_000).optional(),
  scoringRules: EventScoringRulesSchema.optional(),
  scoringMode: z.enum(EVENT_SCORING_MODES).optional(),
});

export class UpdateEventDto extends createZodDto(UpdateEventSchema) {}
