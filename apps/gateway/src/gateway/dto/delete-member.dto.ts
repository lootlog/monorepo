import { z } from "zod";

export const DeleteMemberSchema = z.object({
  id: z.string(),
  discordId: z.string(),
  userId: z.string(),
  guildId: z.string(),
});

export type DeleteMemberDto = z.infer<typeof DeleteMemberSchema>;
