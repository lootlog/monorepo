import { z } from "zod";

export const AddMemberRoleSchema = z.object({
  id: z.string(),
  discordId: z.string(),
  userId: z.string(),
  guildId: z.string(),
  roleId: z.string(),
});

export type AddMemberRoleDto = z.infer<typeof AddMemberRoleSchema>;
