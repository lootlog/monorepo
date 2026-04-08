import { z } from "zod";
import { createZodDto, type ZodDto } from "nestjs-zod";

const SuggestWorldsSchema = z.object({
  search: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const SuggestWorldsDtoBase: ZodDto<typeof SuggestWorldsSchema> =
  createZodDto(SuggestWorldsSchema);

export class SuggestWorldsDto extends SuggestWorldsDtoBase {}
