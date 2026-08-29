import { createZodDto, type ZodDto } from "nestjs-zod";
import { parseSearchTermsQuery } from "#src/shared/query-list.utils";
import { z } from "zod";

export const getPlayersQuerySchema = z.object({
  limit: z.coerce.number().optional().default(10),
  search: z
    .preprocess(
      parseSearchTermsQuery,
      z.union([z.string(), z.array(z.string())]),
    )
    .optional(),
  world: z.string().optional(),
});

const GetPlayersDtoBase: ZodDto<typeof getPlayersQuerySchema> = createZodDto(
  getPlayersQuerySchema,
);

export class GetPlayersDto extends GetPlayersDtoBase {}
