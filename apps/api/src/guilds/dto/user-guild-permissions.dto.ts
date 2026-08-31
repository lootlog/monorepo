import { db as prismaDb } from "#src/prisma/db";
import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

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
