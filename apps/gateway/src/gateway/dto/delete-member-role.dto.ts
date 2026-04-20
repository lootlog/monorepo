import { z } from "zod";

export const DeleteMemberRoleSchema = z.object({
  id: z.string(),
  discordId: z.string(),
  userId: z.string(),
  guildId: z.string(),
  roleId: z.string(),
});

export type DeleteMemberRoleDto = z.infer<typeof DeleteMemberRoleSchema>;
