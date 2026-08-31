import { db as prismaDb } from "#src/prisma/db";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

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

export class RoleResponseDto extends createZodDto(RoleResponseSchema) {}
