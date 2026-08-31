import { z } from "zod";
import { createZodDto, type ZodDto } from "nestjs-zod";
import { db as prismaDb } from "../../prisma/db.js";

const ActivitySource = prismaDb.nativeEnums.public.ActivitySource.members;
type ActivitySource = (typeof ActivitySource)[keyof typeof ActivitySource];
const ActivityType = prismaDb.nativeEnums.public.ActivityType.members;
type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

const singleToArray = (val: unknown) => {
  if (Array.isArray(val)) {
    return val.flatMap((item) =>
      typeof item === "string"
        ? item
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
        : [item],
    );
  }
  if (val === undefined || val === null) return undefined;
  if (typeof val === "string") {
    return val
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
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

const QueryActivitiesDtoBase: ZodDto<typeof QueryActivitiesSchema> =
  createZodDto(QueryActivitiesSchema);

export class QueryActivitiesDto extends QueryActivitiesDtoBase {}
