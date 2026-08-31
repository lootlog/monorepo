import { db as prismaDb } from "#src/prisma/db";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

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
