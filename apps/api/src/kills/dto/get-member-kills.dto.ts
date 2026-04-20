import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import {
  commaSeparatedArray,
  intFromString,
  optionalFromQuery,
} from "@lootlog/nest-shared/validators";
import { NpcType } from "src/generated/prisma/client";

const GetMemberKillsSchema = z.object({
  minLvl: optionalFromQuery(intFromString({ min: 0, max: 500 })),
  maxLvl: optionalFromQuery(intFromString({ min: 0, max: 500 })),
  world: z.string().optional(),
  npcTypes: commaSeparatedArray(z.nativeEnum(NpcType)).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: optionalFromQuery(z.coerce.number().int().min(0)),
});

export class GetMemberKillsDto extends createZodDto(GetMemberKillsSchema) {}
