import { createZodDto } from "nestjs-zod";
import { Permission } from "src/generated/prisma/client";
import { z } from "zod";

const PermissionResponseSchema = z.nativeEnum(Permission);

export class PermissionResponseDto extends createZodDto(
  PermissionResponseSchema,
) {}
