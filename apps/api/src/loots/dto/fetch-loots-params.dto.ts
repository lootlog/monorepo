import { z } from "zod";
import { createZodDto } from "nestjs-zod";
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
  npcLevelMin: z.coerce.number().int().min(0).max(500).optional(),
  npcLevelMax: z.coerce.number().int().min(0).max(500).optional(),
  itemLevelMin: z.coerce.number().int().min(0).max(500).optional(),
  itemLevelMax: z.coerce.number().int().min(0).max(500).optional(),
  playerLevelMin: z.coerce.number().int().min(0).max(500).optional(),
  playerLevelMax: z.coerce.number().int().min(0).max(500).optional(),
  search: z.string().optional(),
  hid: z.string().optional(),
  itemNames: commaSeparatedArray(z.string()).optional(),
  createdAtMin: z.string().optional(),
  createdAtMax: z.string().optional(),
});

export class FetchLootsParamsDto extends createZodDto(FetchLootsParamsSchema) {}
