import { z } from "zod";

const indexItemSchema = z.object({
  id: z.number(),
  hid: z.string().optional(),
  name: z.string(),
  icon: z.string(),
  stat: z.string(),
  lvl: z.number(),
  rarity: z.string().nullable(),
  type: z.string().nullable(),
  world: z.string(),
});

export const indexItemsPayloadSchema = z.array(indexItemSchema);

export type IndexItemsDto = {
  items: z.infer<typeof indexItemsPayloadSchema>;
};
