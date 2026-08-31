import type { Permission } from "#src/db/domain";
import { PermissionResolver } from "./permission-resolver.js";

export const isAdministrativeUser = (permissions: Permission[]) => {
  return PermissionResolver.isAdministrative(permissions);
};
