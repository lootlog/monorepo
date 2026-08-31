import { db as prismaDb } from "../../prisma/db.js";
import { PermissionResolver } from "./permission-resolver.js";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

export const isAdministrativeUser = (permissions: Permission[]) => {
  return PermissionResolver.isAdministrative(permissions);
};
