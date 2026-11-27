import type { AccessPolicy } from "@lootlog/domain/access-policy";
import { Capability } from "@lootlog/schema/permissions";

export const canManageBingo = (
  accessPolicy: AccessPolicy | undefined,
): boolean =>
  accessPolicy?.allowsAny([
    Capability.ADMIN,
    Capability.LOOTLOG_MANAGE,
    Capability.LOOTLOG_EVENTS_MANAGE,
  ]) ?? false;
