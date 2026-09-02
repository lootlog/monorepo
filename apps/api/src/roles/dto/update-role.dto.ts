import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const UpdateRoleSchema = z.object({
  guildId: z.string(),
  id: z.string(),
  name: z.string(),
  color: z.number(),
  position: z.number(),
  admin: z.boolean(),
});

export class UpdateRoleDto extends createSchemaClass(UpdateRoleSchema) {}
