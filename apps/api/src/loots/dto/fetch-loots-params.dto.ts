import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";
import {
  commaSeparatedArray,
  intFromString,
  optionalFromQuery,
} from "#src/shared/validation/query-helpers";
import { MAX_PAGE_LIMIT } from "../config/pagination.js";

const FetchLootsParamsSchema = z.object({
  limit: optionalFromQuery(z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT)),
  cursor: optionalFromQuery(z.coerce.number().int()),
  npcs: commaSeparatedArray(z.string()).optional(),
  players: commaSeparatedArray(z.string()).optional(),
  rarities: commaSeparatedArray(z.string()).optional(),
  professions: commaSeparatedArray(z.string()).optional(),
  npcTypes: commaSeparatedArray(z.string()).optional(),
  world: z.string().optional(),
  npcLevelMin: optionalFromQuery(intFromString({ min: 0, max: 500 })),
  npcLevelMax: optionalFromQuery(intFromString({ min: 0, max: 500 })),
  itemLevelMin: optionalFromQuery(intFromString({ min: 0, max: 500 })),
  itemLevelMax: optionalFromQuery(intFromString({ min: 0, max: 500 })),
  playerLevelMin: optionalFromQuery(intFromString({ min: 0, max: 500 })),
  playerLevelMax: optionalFromQuery(intFromString({ min: 0, max: 500 })),
  search: z.string().optional(),
  hid: z.string().optional(),
  itemNames: commaSeparatedArray(z.string()).optional(),
  createdAtMin: z.string().datetime({ offset: true }).optional(),
  createdAtMax: z.string().datetime({ offset: true }).optional(),
});

export class FetchLootsParamsDto extends createSchemaClass(
  FetchLootsParamsSchema,
) {}
