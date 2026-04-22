import { createZodDto } from "nestjs-zod";
import { Permission } from "src/generated/prisma/client";
import { z } from "zod";

export const PermissionResponseSchema = z.nativeEnum(Permission);
export type PermissionResponse = z.infer<typeof PermissionResponseSchema>;

export class PermissionResponseDto extends createZodDto(
  z.object({
    value: PermissionResponseSchema,
  }),
) {}
