import { eq } from "drizzle-orm";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  notificationJobTable,
  notificationRuleTable,
  notificationTargetTable,
} from "#src/database/drizzle/schema";

export const selectNotificationJobsWithRelations = (
  database: typeof ApiDatabase.Service,
) =>
  database
    .select({
      job: notificationJobTable,
      rule: notificationRuleTable,
      target: notificationTargetTable,
    })
    .from(notificationJobTable)
    .innerJoin(
      notificationRuleTable,
      eq(notificationJobTable.ruleId, notificationRuleTable.id),
    )
    .innerJoin(
      notificationTargetTable,
      eq(notificationJobTable.targetId, notificationTargetTable.id),
    );
