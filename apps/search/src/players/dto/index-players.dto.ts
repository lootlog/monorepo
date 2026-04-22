import { z } from "zod";

const indexPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  lvl: z.number(),
  prof: z.string(),
  icon: z.string(),
  characterId: z.number(),
  accountId: z.number(),
  world: z.string(),
});

export const indexPlayersPayloadSchema = z.array(indexPlayerSchema);

export type IndexPlayersDto = {
  players: z.infer<typeof indexPlayersPayloadSchema>;
};
