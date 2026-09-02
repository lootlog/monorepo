import * as z from "zod";
import { createZodDto } from "nestjs-zod";

const UpdateRoleSchema = z.object({
  guildId: z.string(),
  id: z.string(),
  name: z.string(),
  color: z.number(),
  position: z.number(),
  admin: z.boolean(),
});

export class UpdateRoleDto extends createZodDto(UpdateRoleSchema) {}
