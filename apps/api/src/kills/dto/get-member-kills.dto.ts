import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";
import {
  commaSeparatedArray,
  intFromString,
  optionalFromQuery,
} from "#src/shared/validation/query-helpers";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { KillStatsPeriodSchema } from "../utils/kill-stats-period.js";

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

export class GetMemberKillsDto extends createSchemaClass(
  GetMemberKillsSchema,
) {}
