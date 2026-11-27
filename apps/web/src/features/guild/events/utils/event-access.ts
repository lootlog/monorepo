import { Capability } from "@lootlog/schema/permissions";
import type { AccessPolicy } from "@lootlog/domain/access-policy";

export const canManageEvent = (accessPolicy: AccessPolicy | undefined) =>
  accessPolicy?.allowsAny([
    Capability.LOOTLOG_MANAGE,
    Capability.LOOTLOG_EVENTS_MANAGE,
  ]) ?? false;
