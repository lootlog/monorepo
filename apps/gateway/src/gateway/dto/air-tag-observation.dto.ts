import { AIR_TAG_MAX_BATCH_SIZE } from "@lootlog/types";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const AirTagObservationSchema = z.object({
  targetId: z.string().min(1).max(64),
  nickname: z.string().min(1).max(64),
  clan: z
    .object({
      id: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
      name: z.string().min(1).max(64),
    })
    .optional(),
  relation: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
  ]),
  x: z.number().int().min(0).max(65_535),
  y: z.number().int().min(0).max(65_535),
});

const AirTagObservationBatchSchema = z.object({
  expectedMapId: z.number().int().min(0).max(65_535),
  observations: z
    .array(AirTagObservationSchema)
    .min(1)
    .max(AIR_TAG_MAX_BATCH_SIZE),
});

export class AirTagObservationBatchDto extends createZodDto(
  AirTagObservationBatchSchema,
) {}
