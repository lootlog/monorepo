import { z } from "zod";

export const RequestPlayerPresenceSchema = z.object({
  guildId: z.string().min(1),
  world: z.string().optional(),
});

export type RequestPlayerPresenceDto = z.infer<
  typeof RequestPlayerPresenceSchema
>;
