import type { Permission } from "src/db/domain";
import { PermissionResolver } from "./permission-resolver";

export const isAdministrativeUser = (permissions: Permission[]) => {
  return PermissionResolver.isAdministrative(permissions);
};
