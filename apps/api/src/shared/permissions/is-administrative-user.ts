import type { Permission } from "#src/generated/prisma/client";
import { PermissionResolver } from "./permission-resolver.js";

export const isAdministrativeUser = (permissions: Permission[]) => {
  return PermissionResolver.isAdministrative(permissions);
};
