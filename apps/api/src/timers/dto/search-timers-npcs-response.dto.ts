import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../../prisma/contract.js";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["NpcType"]["values"][number];

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

export class SearchTimersNpcResponseDto extends createZodDto(
  SearchTimersNpcResponseSchema,
) {}
