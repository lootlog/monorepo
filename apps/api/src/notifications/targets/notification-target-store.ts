import { and, eq } from "drizzle-orm";
import { Clock, Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { notificationTargetTable } from "#src/database/drizzle/schema";
import type { JsonValue } from "#src/notifications/notification-database.types";
import type { NotificationOwnerType } from "#src/notifications/notification-enums";
import type { UpdateNotificationTargetRequest } from "#src/contracts/notifications/schemas";

export const mapNotificationTarget = (
  target: typeof notificationTargetTable.$inferSelect,
) => ({
  ...target,
  metadata: target.metadata as JsonValue | null,
});

export const updateNotificationTarget = Effect.fnUntraced(function* (
  database: typeof ApiDatabase.Service,
  targetId: number,
  ownerType: NotificationOwnerType,
  ownerId: string,
  data: UpdateNotificationTargetRequest,
) {
  const displayName = Object.hasOwn(data, "displayName")
    ? { displayName: data.displayName ?? null }
    : {};
  return yield* database
    .update(notificationTargetTable)
    .set({
      ...displayName,
      active: data.active,
      updatedAt: new Date(yield* Clock.currentTimeMillis),
    })
    .where(
      and(
        eq(notificationTargetTable.id, targetId),
        eq(notificationTargetTable.ownerType, ownerType),
        eq(notificationTargetTable.ownerId, ownerId),
      ),
    )
    .returning();
});
