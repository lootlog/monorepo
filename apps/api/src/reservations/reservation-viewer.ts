import { Permission } from "#src/generated/prisma/client";

export type ReservationViewerContext = {
  guildId: string;
  userId: string;
  discordId: string;
  actorIsOwner: boolean;
  permissions: Permission[];
};

export function canModerateReservations(
  context: ReservationViewerContext,
): boolean {
  const permissions = new Set(context.permissions);
  return (
    context.actorIsOwner ||
    permissions.has(Permission.OWNER) ||
    permissions.has(Permission.ADMIN) ||
    permissions.has(Permission.LOOTLOG_MANAGE)
  );
}
