import * as z from "zod";
import { createZodDto } from "nestjs-zod";

const DeleteRoleSchema = z.object({
  guildId: z.string(),
  id: z.string(),
});

export class DeleteRoleDto extends createZodDto(DeleteRoleSchema) {}
