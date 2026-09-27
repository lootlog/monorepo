import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { Clock, Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { notificationJobTable } from "#src/database/drizzle/schema";
import { NotificationJobKind } from "@lootlog/schema/notifications";

export const NOTIFICATION_TEST_WINDOW_MS = 15 * 60_000;

export const getNotificationTestUsageResponse = (
  usage: readonly Date[],
  limit: number,
) => ({
  limit,
  used: usage.length,
  remaining: Math.max(0, limit - usage.length),
  windowSeconds: Math.floor(NOTIFICATION_TEST_WINDOW_MS / 1000),
  nextAvailableAt:
    usage.length >= limit && usage[0]
      ? new Date(usage[0].getTime() + NOTIFICATION_TEST_WINDOW_MS).toISOString()
      : null,
});

export const readNotificationTestUsage = Effect.fnUntraced(function* (
  database: typeof ApiDatabase.Service,
  targetIds: number[],
) {
  if (targetIds.length === 0) return new Map<number, Date[]>();

  const rows = yield* database
    .select({
      targetId: notificationJobTable.targetId,
      createdAt: notificationJobTable.createdAt,
    })
    .from(notificationJobTable)
    .where(
      and(
        inArray(notificationJobTable.targetId, targetIds),
        eq(notificationJobTable.jobKind, NotificationJobKind.TEST),
        gte(
          notificationJobTable.createdAt,
          new Date(
            (yield* Clock.currentTimeMillis) - NOTIFICATION_TEST_WINDOW_MS,
          ),
        ),
      ),
    )
    .orderBy(asc(notificationJobTable.createdAt));

  const usage = new Map<number, Date[]>();

  for (const row of rows) {
    const values = usage.get(row.targetId) ?? [];
    values.push(row.createdAt);
    usage.set(row.targetId, values);
  }

  return usage;
});
