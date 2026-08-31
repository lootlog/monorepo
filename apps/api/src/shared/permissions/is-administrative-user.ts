import type { Contract } from "../../prisma/contract.js";
import { PermissionResolver } from "./permission-resolver.js";

type Permission =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Permission"]["values"][number];

export const isAdministrativeUser = (permissions: Permission[]) => {
  return PermissionResolver.isAdministrative(permissions);
};
