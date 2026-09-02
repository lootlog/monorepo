import * as z from "zod";
import { createZodDto } from "nestjs-zod";

const CreateRoleSchema = z.object({
  guildId: z.string(),
  id: z.string(),
  name: z.string(),
  color: z.number(),
  position: z.number(),
  admin: z.boolean(),
});

export class CreateRoleDto extends createZodDto(CreateRoleSchema) {}
