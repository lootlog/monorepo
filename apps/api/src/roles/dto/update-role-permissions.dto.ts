import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";
import { Permission } from "@lootlog/schema/permissions";

const UpdateRolePermissionsSchema = z.object({
  permissions: z.array(z.nativeEnum(Permission)),
  lvlRangeFrom: z.number(),
  lvlRangeTo: z.number(),
});

export class UpdateRolePermissionsDto extends createSchemaClass(
  UpdateRolePermissionsSchema,
) {}
