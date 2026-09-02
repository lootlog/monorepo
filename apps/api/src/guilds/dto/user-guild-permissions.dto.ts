import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";
import { Permission } from "@lootlog/schema/permissions";

const UserGuildPermissionsRoleSchema = z.object({
  id: z.string(),
  lvlRangeFrom: z.number(),
  lvlRangeTo: z.number(),
  permissions: z.array(z.nativeEnum(Permission)),
});

export class UserGuildPermissionsRole extends createSchemaClass(
  UserGuildPermissionsRoleSchema,
) {}

const UserGuildPermissionsGuildSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
});

export class UserGuildPermissionsGuild extends createSchemaClass(
  UserGuildPermissionsGuildSchema,
) {}

const UserGuildPermissionsSchema = z.object({
  guild: UserGuildPermissionsGuildSchema,
  roles: z.array(UserGuildPermissionsRoleSchema),
});

export class UserGuildPermissionsDto extends createSchemaClass(
  UserGuildPermissionsSchema,
) {}
