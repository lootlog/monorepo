import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { NpcType } from "src/generated/prisma/client";
import { commaSeparatedArray } from "src/shared/zod/query-helpers";

const GetGuildKillStatsSchema = z
  .object({
    npcTypes: commaSeparatedArray(z.nativeEnum(NpcType)).optional(),
    minLvl: z.coerce.number().int().min(0).optional(),
    maxLvl: z.coerce.number().int().min(0).optional(),
    world: z.string().optional(),
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
});

export class GetUserKillStatsDto extends createZodDto(GetUserKillStatsSchema) {}
