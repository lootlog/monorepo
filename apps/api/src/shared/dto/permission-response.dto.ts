import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../../prisma/contract.js";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Permission"]["values"][number];

export const PermissionResponseSchema = z.nativeEnum(Permission);
export type PermissionResponse = z.infer<typeof PermissionResponseSchema>;

export class PermissionResponseDto extends createZodDto(
  z.object({
    value: PermissionResponseSchema,
  }),
) {}
