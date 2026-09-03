import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import {
  FALLBACK_NPC_NAME,
  FALLBACK_WORLD_NAME,
} from "#src/notifications/content/notification-messages";
import type { NotificationContentModule } from "#src/notifications/content/notification-content.service";
import type { NotificationEventStore } from "#src/notifications/delivery/notification-event-store";
import type { NotificationMatching } from "#src/notifications/rules/notification-matching.service";
import {
  NotificationScheduleAnchor,
  NotificationTriggerType,
  type NotificationScheduleAnchor as NotificationScheduleAnchorValue,
  type NotificationScheduleStrategy,
  type NotificationTargetType,
  type NotificationTriggerType as NotificationTriggerTypeValue,
} from "#src/notifications/notification-enums";
import type { JsonValue } from "#src/notifications/notification-database.types";

export interface NotificationTestContentInput {
  readonly notificationRule: {
    readonly id: number;
    readonly ownerType: string;
    readonly ownerId: string;
    readonly guildId: string | null;
    readonly name: string | null;
    readonly world: string | null;
    readonly triggerType: NotificationTriggerTypeValue;
    readonly filters: JsonValue | null;
    readonly scheduleStrategy: NotificationScheduleStrategy | null;
    readonly scheduleAnchor: NotificationScheduleAnchorValue | null;
    readonly scheduleOffsetMinutes: number | null;
    readonly contentTemplate: string | null;
  };
  readonly scheduledFor: Date;
  readonly targetType: NotificationTargetType;
}

const npcName = (npc: unknown) => {
  if (!npc || typeof npc !== "object" || Array.isArray(npc)) return null;
  const name = (npc as Record<string, unknown>).name;
  return typeof name === "string" ? name : null;
};

export const makeNotificationTestContent = (
  store: NotificationEventStore,
  matching: NotificationMatching,
  content: NotificationContentModule,
) =>
  Effect.fn("notifications.content.testPayload")(function* (
    input: NotificationTestContentInput,
  ) {
    const { notificationRule: rule, scheduledFor } = input;
    if (rule.triggerType !== NotificationTriggerType.TIMER_BEFORE_SPAWN) {
      return content.buildGenericTestNotificationPayload(input);
    }
    if (rule.guildId) {
      const timers = yield* store.timersForRule(rule.guildId, rule.world);
      const timer = timers.find((candidate) =>
        matching.matchesTimerRule(rule.filters, candidate.npcId),
      );
      if (timer) {
        return content.buildTimerNotificationPayload({
          notificationRule: rule,
          target: { targetType: input.targetType },
          npcId: timer.npcId,
          npcName: npcName(timer.npc),
          world: timer.world,
          timerKey: timer.timerKey,
          minSpawnTime: timer.minSpawnTime,
          maxSpawnTime: timer.maxSpawnTime,
          scheduledFor,
        });
      }
    }
    const filters = matching.parseFilters(rule.filters);
    const fallbackNpcId = filters.npcId ?? filters.npcIds?.[0] ?? 0;
    const offset = rule.scheduleOffsetMinutes ?? 0;
    const minSpawnTime =
      rule.scheduleAnchor === NotificationScheduleAnchor.MAX_SPAWN
        ? new Date(scheduledFor.getTime() + Math.max(0, offset - 20) * 60_000)
        : new Date(scheduledFor.getTime() + offset * 60_000);
    const maxSpawnTime =
      rule.scheduleAnchor === NotificationScheduleAnchor.MAX_SPAWN
        ? new Date(scheduledFor.getTime() + offset * 60_000)
        : new Date(minSpawnTime.getTime() + 20 * 60_000);
    return content.buildTimerNotificationPayload({
      notificationRule: rule,
      target: { targetType: input.targetType },
      npcId: fallbackNpcId,
      npcName: fallbackNpcId > 0 ? null : FALLBACK_NPC_NAME,
      world: rule.world ?? FALLBACK_WORLD_NAME,
      timerKey: `test-${randomUUID()}`,
      minSpawnTime,
      maxSpawnTime,
      scheduledFor,
    });
  });
