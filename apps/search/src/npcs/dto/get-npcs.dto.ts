import { createZodDto, type ZodDto } from "nestjs-zod";
import { z } from "zod";

function parseCommaSeparatedQuery(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .split(",")
    .map((searchTerm) => searchTerm.trim())
    .filter(Boolean);
}

export const getNpcsQuerySchema = z.object({
  ids: z
    .preprocess(parseCommaSeparatedQuery, z.array(z.coerce.number().int()))
    .optional(),
  limit: z.coerce.number().optional().default(10),
  search: z
    .preprocess(
      (value) => {
        if (typeof value !== "string") {
          return value;
        }

        if (!value.includes(",")) {
          return value;
        }

        return parseCommaSeparatedQuery(value);
      },
      z.union([z.string(), z.array(z.string())]),
    )
    .optional(),
  world: z.string().optional(),
});

const GetNpcsDtoBase: ZodDto<typeof getNpcsQuerySchema> =
  createZodDto(getNpcsQuerySchema);

export class GetNpcsDto extends GetNpcsDtoBase {}
