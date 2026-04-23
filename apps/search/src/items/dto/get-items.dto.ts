import { createZodDto, type ZodDto } from "nestjs-zod";
import { z } from "zod";

const stringOrStringArraySchema = z.union([z.string(), z.array(z.string())]);

const csvQueryParamSchema = z
  .preprocess((value) => {
    const values = Array.isArray(value) ? value : [value];

    return values
      .flatMap((entry) => String(entry).split(","))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }, z.array(z.string()))
  .optional();

export const getItemsQuerySchema = z.object({
  limit: z.coerce.number().optional().default(20),
  offset: z.coerce.number().optional().default(0),
  search: z.string().optional(),
  world: z.string().optional(),
  filter: stringOrStringArraySchema.optional(),
  facets: csvQueryParamSchema,
  sort: csvQueryParamSchema,
});

const GetItemsDtoBase: ZodDto<typeof getItemsQuerySchema> =
  createZodDto(getItemsQuerySchema);

export class GetItemsDto extends GetItemsDtoBase {}
