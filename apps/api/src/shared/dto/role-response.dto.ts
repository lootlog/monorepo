import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { Permission } from "src/generated/prisma/client";

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
