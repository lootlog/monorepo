import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";

const SearchTimersNpcResponseSchema = z.object({
  npcId: z.number(),
  timerKey: z.string(),
  name: z.string(),
  lvl: z.number(),
  type: z.nativeEnum(NpcType),
  prof: z.string(),
  location: z.string(),
  wt: z.union([z.string(), z.number()]),
  icon: z.string(),
  latestRespBaseSeconds: z.number().nullable(),
  latestRespawnRandomness: z.number().nullable(),
});

export class SearchTimersNpcResponseDto extends createSchemaClass(
  SearchTimersNpcResponseSchema,
) {}
