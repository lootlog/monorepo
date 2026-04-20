import { z } from "zod";

export const RequestServerPresenceSchema = z.object({
  guildId: z.string().min(1),
  world: z.string().min(1),
});

export type RequestServerPresenceDto = z.infer<
  typeof RequestServerPresenceSchema
>;
