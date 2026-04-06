import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { commaSeparatedArray, intFromString } from "@lootlog/nest-shared";
import { NpcType } from "src/generated/prisma/client";

const GetMemberKillsSchema = z.object({
  minLvl: intFromString({ min: 0, max: 500 }).optional(),
  maxLvl: intFromString({ min: 0, max: 500 }).optional(),
  world: z.string().optional(),
  npcTypes: commaSeparatedArray(z.nativeEnum(NpcType)).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.coerce.number().int().min(0).optional(),
});

export class GetMemberKillsDto extends createZodDto(GetMemberKillsSchema) {}
