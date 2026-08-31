import { db as prismaDb } from "#src/prisma/db";
import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

const UpdateRolePermissionsSchema = z.object({
  permissions: z.array(z.nativeEnum(Permission)),
  lvlRangeFrom: z.number(),
  lvlRangeTo: z.number(),
});

export class UpdateRolePermissionsDto extends createZodDto(
  UpdateRolePermissionsSchema,
) {}
