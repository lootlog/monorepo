import { Permission } from "prisma/generated/client";
import { PermissionResolver } from "./permission-resolver";

export const isAdministrativeUser = (permissions: Permission[]) => {
  return PermissionResolver.isAdministrative(permissions);
};
