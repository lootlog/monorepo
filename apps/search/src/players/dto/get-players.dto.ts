import { createZodDto, type ZodDto } from "nestjs-zod";
import { parseCommaSeparatedSearchQuery } from "src/shared/query-helpers";
import { z } from "zod";

export const getPlayersQuerySchema = z.object({
  limit: z.coerce.number().optional().default(10),
  search: z
    .preprocess(
      parseCommaSeparatedSearchQuery,
      z.union([z.string(), z.array(z.string())]),
    )
    .optional(),
  world: z.string().optional(),
});

const GetPlayersDtoBase: ZodDto<typeof getPlayersQuerySchema> = createZodDto(
  getPlayersQuerySchema,
);

export class GetPlayersDto extends GetPlayersDtoBase {}
