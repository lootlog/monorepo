import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../../prisma/contract.js";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Permission"]["values"][number];

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
