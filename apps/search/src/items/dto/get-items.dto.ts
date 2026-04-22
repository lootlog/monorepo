import { createZodDto, type ZodDto } from "nestjs-zod";
import { z } from "zod";

export const getItemsQuerySchema = z.object({
  limit: z.coerce.number().optional().default(3),
  search: z.string().optional(),
  world: z.string().optional(),
});

const GetItemsDtoBase: ZodDto<typeof getItemsQuerySchema> =
  createZodDto(getItemsQuerySchema);

export class GetItemsDto extends GetItemsDtoBase {}
