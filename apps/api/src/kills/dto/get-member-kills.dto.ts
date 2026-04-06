import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { NpcType } from "src/generated/prisma/client";
import { commaSeparatedArray } from "src/shared/zod/query-helpers";

const GetMemberKillsSchema = z.object({
  minLvl: z.coerce.number().int().min(0).optional(),
  maxLvl: z.coerce.number().int().min(0).optional(),
  world: z.string().optional(),
  npcTypes: commaSeparatedArray(z.nativeEnum(NpcType)).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.coerce.number().int().min(0).optional(),
});

export class GetMemberKillsDto extends createZodDto(GetMemberKillsSchema) {}
