import { z } from "zod";
import { createZodDto, type ZodDto } from "nestjs-zod";

export const itemHitSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    icon: z.string(),
    stat: z.string().default(""),
    lvl: z.number(),
    rarity: z.string().nullable(),
    type: z.string().nullable(),
    worlds: z.array(z.string()).default([]),
  })
  .describe("Item search hit");

const ItemHitDtoBase: ZodDto<typeof itemHitSchema, false> =
  createZodDto(itemHitSchema);

export class ItemHitDto extends ItemHitDtoBase {}
