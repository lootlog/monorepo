import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { ActivityType, ActivitySource } from "src/generated/prisma/client";

const singleToArray = (val: unknown) => {
  if (Array.isArray(val)) return val;
  if (val === undefined || val === null) return undefined;
  return [val];
};

const QueryActivitiesSchema = z.object({
  userId: z.string().optional(),
  guildId: z.string().optional(),
  type: z.preprocess(
    singleToArray,
    z.array(z.nativeEnum(ActivityType)).optional(),
  ),
  source: z.preprocess(
    singleToArray,
    z.array(z.nativeEnum(ActivitySource)).optional(),
  ),
  playerName: z.string().optional(),
  clanName: z.string().optional(),
  world: z.string().optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export class QueryActivitiesDto extends createZodDto(QueryActivitiesSchema) {}
