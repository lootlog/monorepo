import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { levelFilterSchema } from "@lootlog/nest-shared";
import { MAX_PAGE_LIMIT } from "../config/pagination";
import { commaSeparatedArray } from "src/shared/zod/query-helpers";

const FetchLootsParamsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).optional(),
  cursor: z.coerce.number().int().optional(),
  npcs: commaSeparatedArray(z.string()).optional(),
  players: commaSeparatedArray(z.string()).optional(),
  rarities: commaSeparatedArray(z.string()).optional(),
  npcTypes: commaSeparatedArray(z.string()).optional(),
  world: z.string().optional(),
  npcLevelMin: levelFilterSchema,
  npcLevelMax: levelFilterSchema,
  itemLevelMin: levelFilterSchema,
  itemLevelMax: levelFilterSchema,
  playerLevelMin: levelFilterSchema,
  playerLevelMax: levelFilterSchema,
  search: z.string().optional(),
  hid: z.string().optional(),
  itemNames: commaSeparatedArray(z.string()).optional(),
  createdAtMin: z.string().datetime({ offset: true }).optional(),
  createdAtMax: z.string().datetime({ offset: true }).optional(),
});

export class FetchLootsParamsDto extends createZodDto(FetchLootsParamsSchema) {}
