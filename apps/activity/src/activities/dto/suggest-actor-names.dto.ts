import { z } from "zod";
import { createZodDto, type ZodDto } from "nestjs-zod";

const SuggestActorNamesSchema = z.object({
  search: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const SuggestActorNamesDtoBase: ZodDto<typeof SuggestActorNamesSchema> =
  createZodDto(SuggestActorNamesSchema);

export class SuggestActorNamesDto extends SuggestActorNamesDtoBase {}
