import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const UpdateKillPointSchema = z.object({
  pointsDelta: z.number().finite(),
  comment: z.string().max(500).optional(),
});

export class UpdateKillPointDto extends createSchemaClass(
  UpdateKillPointSchema,
) {}

const UpdateRankingPointsSchema = z.object({
  pointsDelta: z.number().finite(),
  comment: z.string().max(500).optional(),
});

export class UpdateRankingPointsDto extends createSchemaClass(
  UpdateRankingPointsSchema,
) {}
