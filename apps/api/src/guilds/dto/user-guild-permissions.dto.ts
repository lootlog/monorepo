import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { Permission } from "#src/db/domain";

const UserGuildPermissionsRoleSchema = z.object({
  id: z.string(),
  lvlRangeFrom: z.number(),
  lvlRangeTo: z.number(),
  permissions: z.array(z.nativeEnum(Permission)),
});

export class UserGuildPermissionsRole extends createZodDto(
  UserGuildPermissionsRoleSchema,
) {}

const UserGuildPermissionsGuildSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
});

export class UserGuildPermissionsGuild extends createZodDto(
  UserGuildPermissionsGuildSchema,
) {}

const UserGuildPermissionsSchema = z.object({
  guild: UserGuildPermissionsGuildSchema,
  roles: z.array(UserGuildPermissionsRoleSchema),
});

export class UserGuildPermissionsDto extends createZodDto(
  UserGuildPermissionsSchema,
) {}
