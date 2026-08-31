import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../prisma/contract.js";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Permission"]["values"][number];

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
