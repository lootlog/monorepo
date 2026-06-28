import { createZodDto, type ZodDto } from "nestjs-zod";
import {
  parseCommaSeparatedQuery,
  parseCommaSeparatedSearchQuery,
} from "src/shared/query-helpers";
import { z } from "zod";

export const getNpcsQuerySchema = z.object({
  ids: z
    .preprocess(parseCommaSeparatedQuery, z.array(z.coerce.number().int()))
    .optional(),
  limit: z.coerce.number().optional().default(10),
  search: z
    .preprocess(
      parseCommaSeparatedSearchQuery,
      z.union([z.string(), z.array(z.string())]),
    )
    .optional(),
  world: z.string().optional(),
});

const GetNpcsDtoBase: ZodDto<typeof getNpcsQuerySchema> =
  createZodDto(getNpcsQuerySchema);

export class GetNpcsDto extends GetNpcsDtoBase {}
