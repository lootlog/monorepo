import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import {
  commaSeparatedArray,
  intFromString,
} from "@lootlog/nest-shared/validators/query-helpers";
import { NpcType } from "#src/db/domain";
import { KillStatsPeriodSchema } from "../utils/kill-stats-period.js";

const GetGuildKillStatsSchema = z
  .object({
    npcTypes: commaSeparatedArray(z.nativeEnum(NpcType)).optional(),
    minLvl: intFromString({ min: 0, max: 500 }).optional(),
    maxLvl: intFromString({ min: 0, max: 500 }).optional(),
    world: z.string().optional(),
    period: KillStatsPeriodSchema.optional(),
  })
  .refine(
    (data) =>
      data.minLvl === undefined ||
      data.maxLvl === undefined ||
      data.minLvl <= data.maxLvl,
    { message: "minLvl must be <= maxLvl", path: ["minLvl"] },
  );

export class GetGuildKillStatsDto extends createZodDto(
  GetGuildKillStatsSchema,
) {}

const GetUserKillStatsSchema = z.object({
  npcTypes: commaSeparatedArray(z.nativeEnum(NpcType)).optional(),
  npcType: z.nativeEnum(NpcType).optional(),
  world: z.string().optional(),
  topNpcsLimit: z.coerce.number().int().min(1).optional(),
  period: KillStatsPeriodSchema.optional(),
});

export class GetUserKillStatsDto extends createZodDto(GetUserKillStatsSchema) {}
