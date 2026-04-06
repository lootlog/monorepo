import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { commaSeparatedArray, intFromString } from "@lootlog/nest-shared";
import { MAX_PAGE_LIMIT } from "../config/pagination";

const FetchLootsParamsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).optional(),
  cursor: z.coerce.number().int().optional(),
  npcs: commaSeparatedArray(z.string()).optional(),
  players: commaSeparatedArray(z.string()).optional(),
  rarities: commaSeparatedArray(z.string()).optional(),
  npcTypes: commaSeparatedArray(z.string()).optional(),
  world: z.string().optional(),
  npcLevelMin: intFromString({ min: 0, max: 500 }).optional(),
  npcLevelMax: intFromString({ min: 0, max: 500 }).optional(),
  itemLevelMin: intFromString({ min: 0, max: 500 }).optional(),
  itemLevelMax: intFromString({ min: 0, max: 500 }).optional(),
  playerLevelMin: intFromString({ min: 0, max: 500 }).optional(),
  playerLevelMax: intFromString({ min: 0, max: 500 }).optional(),
  search: z.string().optional(),
  hid: z.string().optional(),
  itemNames: commaSeparatedArray(z.string()).optional(),
  createdAtMin: z.string().datetime({ offset: true }).optional(),
  createdAtMax: z.string().datetime({ offset: true }).optional(),
});

export class FetchLootsParamsDto extends createZodDto(FetchLootsParamsSchema) {}
