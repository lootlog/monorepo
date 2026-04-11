import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { NpcType } from "src/generated/prisma/client";

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
