import { createZodDto, type ZodDto } from "nestjs-zod";
import { z } from "zod";

export const itemHitSchema = z
  .object({
    id: z.number(),
    hid: z.string().default(""),
    name: z.string(),
    icon: z.string(),
    lvl: z.number(),
    rarity: z.string().nullable(),
    type: z.string().nullable(),
    world: z.string(),
  })
  .describe("Item search hit");

const ItemHitDtoBase: ZodDto<typeof itemHitSchema, false> =
  createZodDto(itemHitSchema);

export class ItemHitDto extends ItemHitDtoBase {}

const GetItemsResponseSchema = z.array(itemHitSchema);

const GetItemsResponseDtoBase: ZodDto<typeof GetItemsResponseSchema, false> =
  createZodDto(GetItemsResponseSchema);

export class GetItemsResponseDto extends GetItemsResponseDtoBase {}
