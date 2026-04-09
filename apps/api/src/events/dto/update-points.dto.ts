import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const UpdateKillPointSchema = z.object({
  pointsDelta: z.number().finite(),
  comment: z.string().max(500).optional(),
});

export class UpdateKillPointDto extends createZodDto(UpdateKillPointSchema) {}

const UpdateRankingPointsSchema = z.object({
  pointsDelta: z.number().finite(),
  comment: z.string().max(500).optional(),
});

export class UpdateRankingPointsDto extends createZodDto(
  UpdateRankingPointsSchema,
) {}
