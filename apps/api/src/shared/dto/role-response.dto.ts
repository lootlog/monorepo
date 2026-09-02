import { createSchemaClass } from "#src/shared/validation/schema-class";
import { Permission } from "@lootlog/schema/permissions";
import * as z from "zod";

const RoleResponseSchema = z.object({
  id: z.string(),
  guildId: z.string(),
  name: z.string(),
  color: z.number().nullable(),
  position: z.number().nullable().optional(),
  permissions: z.array(z.nativeEnum(Permission)),
  lvlRangeFrom: z.number().nullable().optional(),
  lvlRangeTo: z.number().nullable().optional(),
});

export class RoleResponseDto extends createSchemaClass(RoleResponseSchema) {}
