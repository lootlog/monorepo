import { z } from "zod";

export const AddMemberSchema = z.object({
  id: z.string(),
  discordId: z.string(),
  userId: z.string(),
  guildId: z.string(),
});

export type AddMemberDto = z.infer<typeof AddMemberSchema>;
