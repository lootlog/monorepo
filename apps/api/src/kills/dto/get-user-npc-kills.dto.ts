import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { NpcType } from "src/generated/prisma/client";
import { commaSeparatedArray } from "src/shared/zod/query-helpers";

const GetUserNpcKillsSchema = z.object({
  npcTypes: commaSeparatedArray(z.nativeEnum(NpcType)).optional(),
  world: z.string().optional(),
  search: z.string().optional(),
  cursor: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  sortBy: z.enum(["kills", "level"]).optional(),
  minLvl: z.coerce.number().int().min(0).optional(),
  maxLvl: z.coerce.number().int().min(0).optional(),
});

export class GetUserNpcKillsDto extends createZodDto(GetUserNpcKillsSchema) {}
