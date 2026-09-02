import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const DeleteRoleSchema = z.object({
  guildId: z.string(),
  id: z.string(),
});

export class DeleteRoleDto extends createSchemaClass(DeleteRoleSchema) {}
