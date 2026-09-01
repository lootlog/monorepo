import { Capability, type AccessPolicy } from "@lootlog/access-policy";

export const canManageGuild = (accessPolicy: AccessPolicy | undefined) =>
  accessPolicy?.allows(Capability.ADMIN) ?? false;
