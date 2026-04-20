import { createZodDto, type ZodDto } from "nestjs-zod";
import { z } from "zod";

export const searchAllQuerySchema = z.object({
  limit: z.coerce.number().optional().default(10),
  search: z.string().optional(),
  world: z.string().optional(),
});

const SearchAllDtoBase: ZodDto<typeof searchAllQuerySchema> =
  createZodDto(searchAllQuerySchema);

export class SearchAllDto extends SearchAllDtoBase {}
