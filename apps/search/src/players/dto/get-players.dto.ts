import { createZodDto, type ZodDto } from "nestjs-zod";
import { z } from "zod";

function parseSearchQuery(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  if (!value.includes(",")) {
    return value;
  }

  return value
    .split(",")
    .map((searchTerm) => searchTerm.trim())
    .filter(Boolean);
}

export const getPlayersQuerySchema = z.object({
  limit: z.coerce.number().optional().default(10),
  search: z
    .preprocess(parseSearchQuery, z.union([z.string(), z.array(z.string())]))
    .optional(),
  world: z.string().optional(),
});

const GetPlayersDtoBase: ZodDto<typeof getPlayersQuerySchema> = createZodDto(
  getPlayersQuerySchema,
);

export class GetPlayersDto extends GetPlayersDtoBase {}
