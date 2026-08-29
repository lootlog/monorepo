import { createZodDto, type ZodDto } from "nestjs-zod";
import {
  parseCommaSeparatedQueryList,
  parseSearchTermsQuery,
} from "#src/shared/query-list.utils";
import { z } from "zod";

export const getNpcsQuerySchema = z.object({
  ids: z
    .preprocess(parseCommaSeparatedQueryList, z.array(z.coerce.number().int()))
    .optional(),
  limit: z.coerce.number().optional().default(10),
  search: z
    .preprocess(
      parseSearchTermsQuery,
      z.union([z.string(), z.array(z.string())]),
    )
    .optional(),
  world: z.string().optional(),
});

const GetNpcsDtoBase: ZodDto<typeof getNpcsQuerySchema> =
  createZodDto(getNpcsQuerySchema);

export class GetNpcsDto extends GetNpcsDtoBase {}
