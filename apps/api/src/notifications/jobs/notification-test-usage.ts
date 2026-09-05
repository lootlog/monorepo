import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { Clock, Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { notificationJobTable } from "#src/database/drizzle/schema";
import { NotificationJobKind } from "@lootlog/schema/notifications";

export const readNotificationTestUsage = Effect.fnUntraced(function* (
  database: typeof ApiDatabase.Service,
  targetIds: number[],
  windowMs: number,
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
          new Date((yield* Clock.currentTimeMillis) - windowMs),
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
