import { Permission } from "src/generated/prisma/client";
import { PermissionResolver } from "./permission-resolver";

export const isAdministrativeUser = (permissions: Permission[]) => {
  return PermissionResolver.isAdministrative(permissions);
};
