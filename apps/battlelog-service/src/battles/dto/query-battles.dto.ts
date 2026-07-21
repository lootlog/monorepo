import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import {
  booleanFromString,
  commaSeparatedArray,
} from "@lootlog/nest-shared/validators/query-helpers";

export type SortOrder = "asc" | "desc";

const QueryBattlesSchema = z.object({
  cursor: z.string().optional(),
  size: z.coerce.number().min(1).max(100).default(20),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  includeTotal: booleanFromString.default(false),
  world: z.string().optional(),
  type: commaSeparatedArray(z.enum(["solo", "group"])).optional(),
  userId: z.string().optional(),
  public: booleanFromString.optional(),
  characterId: commaSeparatedArray(z.string()).optional(),
  search: z.string().optional(),
  result: commaSeparatedArray(z.enum(["won", "lost", "flee"])).optional(),
  ph: booleanFromString.optional(),
  matchmaking: booleanFromString.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minLevel: z.coerce.number().min(1).max(1000).optional(),
  maxLevel: z.coerce.number().min(1).max(1000).optional(),
});

export class QueryBattlesDto extends createZodDto(QueryBattlesSchema) {}
