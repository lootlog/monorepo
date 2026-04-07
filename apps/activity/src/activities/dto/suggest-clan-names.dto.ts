import { z } from "zod";
import { createZodDto, type ZodDto } from "nestjs-zod";

const SuggestClanNamesSchema = z.object({
  search: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const SuggestClanNamesDtoBase: ZodDto<typeof SuggestClanNamesSchema> =
  createZodDto(SuggestClanNamesSchema);

export class SuggestClanNamesDto extends SuggestClanNamesDtoBase {}
