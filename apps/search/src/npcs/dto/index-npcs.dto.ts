import { z } from "zod";

const indexNpcSchema = z.object({
  id: z.number(),
  prof: z
    .string()
    .nullish()
    .transform((prof) => prof ?? ""),
  icon: z.string(),
  name: z.string(),
  lvl: z.number(),
  wt: z.number(),
  type: z.string(),
  margonemType: z.number(),
  world: z.string(),
});

export const indexNpcsPayloadSchema = z.array(indexNpcSchema);
export const compiledIndexNpcsPayloadSchema = z.compile(
  indexNpcsPayloadSchema,
  {
    strict: true,
  },
);

export type IndexNpcsDto = {
  npcs: z.infer<typeof indexNpcsPayloadSchema>;
};
