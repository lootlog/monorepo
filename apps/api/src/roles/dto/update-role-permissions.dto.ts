import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { Permission } from "src/generated/prisma/client";

const UpdateRolePermissionsSchema = z.object({
  permissions: z.array(z.nativeEnum(Permission)),
  lvlRangeFrom: z.number(),
  lvlRangeTo: z.number(),
});

export class UpdateRolePermissionsDto extends createZodDto(
  UpdateRolePermissionsSchema,
) {}
