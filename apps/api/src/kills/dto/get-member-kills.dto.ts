import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../../prisma/contract.js";
import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import {
  commaSeparatedArray,
  intFromString,
  optionalFromQuery,
} from "@lootlog/nest-shared/validators/query-helpers";
import { KillStatsPeriodSchema } from "../utils/kill-stats-period.js";

const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["NpcType"]["values"][number];

const GetMemberKillsSchema = z.object({
  minLvl: optionalFromQuery(intFromString({ min: 0, max: 500 })),
  maxLvl: optionalFromQuery(intFromString({ min: 0, max: 500 })),
  world: z.string().optional(),
  npcTypes: commaSeparatedArray(z.nativeEnum(NpcType)).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: optionalFromQuery(z.coerce.number().int().min(0)),
  period: KillStatsPeriodSchema.optional(),
});

export class GetMemberKillsDto extends createZodDto(GetMemberKillsSchema) {}
