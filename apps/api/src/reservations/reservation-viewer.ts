import {
  AccessRequirement,
  createAccessPolicy,
} from "@lootlog/domain/access-policy";
import type { Permission as PermissionValue } from "@lootlog/schema/permissions";

export type ReservationViewerContext = {
  guildId: string;
  userId: string;
  discordId: string;
  permissions: PermissionValue[];
};

export function canModerateReservations(
  context: ReservationViewerContext,
): boolean {
  return createAccessPolicy({ capabilities: context.permissions }).allowsAny(
    AccessRequirement.MODERATE,
  );
}
