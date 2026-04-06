import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { commaSeparatedArray, intFromString } from "@lootlog/nest-shared";
import { NpcType } from "src/generated/prisma/client";

const GetUserNpcKillsSchema = z
  .object({
    npcTypes: commaSeparatedArray(z.nativeEnum(NpcType)).optional(),
    world: z.string().optional(),
    search: z.string().optional(),
    cursor: z.coerce.number().int().min(0).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    sortBy: z.enum(["kills", "level"]).optional(),
    minLvl: intFromString({ min: 0, max: 500 }).optional(),
    maxLvl: intFromString({ min: 0, max: 500 }).optional(),
  })
  .refine(
    (data) =>
      data.minLvl === undefined ||
      data.maxLvl === undefined ||
      data.minLvl <= data.maxLvl,
    { message: "minLvl must be <= maxLvl", path: ["minLvl"] },
  );

export class GetUserNpcKillsDto extends createZodDto(GetUserNpcKillsSchema) {}
