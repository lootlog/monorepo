import { createZodDto, type ZodDto } from "nestjs-zod";
import { z } from "zod";

const itemStatValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);

export const itemHitSchema = z
  .object({
    id: z.number(),
    hid: z.string().default(""),
    name: z.string(),
    icon: z.string(),
    stat: z.string().default(""),
    stats: z.record(z.string(), itemStatValueSchema).default({}),
    numericStats: z.record(z.string(), z.number()).default({}),
    statsKeys: z.array(z.string()).default([]),
    requiredProfessions: z.array(z.string()).default([]),
    lvl: z.number(),
    rarity: z.string().nullable(),
    type: z.string().nullable(),
    world: z.string(),
  })
  .describe("Item search hit");

const ItemHitDtoBase: ZodDto<typeof itemHitSchema, false> =
  createZodDto(itemHitSchema);

export class ItemHitDto extends ItemHitDtoBase {}
