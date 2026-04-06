import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const DeleteMemberRoleSchema = z.object({
  id: z.string(),
  discordId: z.string(),
  userId: z.string(),
  guildId: z.string(),
  roleId: z.string(),
});

export class DeleteMemberRoleDto extends createZodDto(DeleteMemberRoleSchema) {}
