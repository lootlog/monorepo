import { Capability, type AccessPolicy } from "@lootlog/access-policy";

export const canWriteGuildDocs = (accessPolicy: AccessPolicy | undefined) =>
  accessPolicy?.allows(Capability.LOOTLOG_DOCS_WRITE) ?? false;

export const canManageGuildDocs = (accessPolicy: AccessPolicy | undefined) =>
  accessPolicy?.allows(Capability.ADMIN) ?? false;

export const canReadGuildDocs = (accessPolicy: AccessPolicy | undefined) =>
  accessPolicy?.allowsAny([
    Capability.LOOTLOG_DOCS_READ,
    Capability.LOOTLOG_DOCS_WRITE,
  ]) ?? false;
