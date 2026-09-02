import { and, desc, eq } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
} from "#src/database/drizzle/schema";

const RULE_NAME = "__system:reservation-reminder__";

export class ReservationReminderRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  async findActiveDiscordDmTarget(discordId: string) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(notificationTargetTable)
          .where(
            and(
              eq(notificationTargetTable.ownerType, "USER"),
              eq(notificationTargetTable.ownerId, discordId),
              eq(notificationTargetTable.provider, "DISCORD"),
              eq(notificationTargetTable.targetType, "DM"),
              eq(notificationTargetTable.active, true),
              eq(notificationTargetTable.canSend, true),
            ),
          )
          .orderBy(desc(notificationTargetTable.updatedAt))
          .limit(1),
      ),
    );
    return rows[0] ?? null;
  }

  async getOrCreateRule(discordId: string) {
    const existing = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(notificationRuleTable)
          .where(
            and(
              eq(notificationRuleTable.ownerType, "USER"),
              eq(notificationRuleTable.ownerId, discordId),
              eq(notificationRuleTable.name, RULE_NAME),
            ),
          )
          .limit(1),
      ),
    );
    if (existing[0]) return existing[0];

    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.transaction((transaction) =>
          Effect.gen(function* () {
            const targets = yield* transaction
              .select({ id: notificationTargetTable.id })
              .from(notificationTargetTable)
              .where(
                and(
                  eq(notificationTargetTable.ownerType, "USER"),
                  eq(notificationTargetTable.ownerId, discordId),
                  eq(notificationTargetTable.targetType, "DM"),
                  eq(notificationTargetTable.active, true),
                  eq(notificationTargetTable.canSend, true),
                ),
              )
              .orderBy(desc(notificationTargetTable.updatedAt))
              .limit(1);
            const target = targets[0];
            if (!target) return null;

            const rules = yield* transaction
              .insert(notificationRuleTable)
              .values({
                ownerType: "USER",
                ownerId: discordId,
                triggerType: "SCHEDULED_MESSAGE",
                name: RULE_NAME,
                scheduleStrategy: "FIXED_DATETIME",
                enabled: true,
                updatedAt: new Date(),
              })
              .returning();
            const rule = rules[0];
            if (!rule) return null;
            yield* transaction
              .insert(notificationRuleTargetTable)
              .values({ ruleId: rule.id, targetId: target.id });
            return rule;
          }),
        ),
      ),
    );
  }
}
