import { Context, Layer } from "effect";
import type { NotificationJobOperations } from "#src/notifications/jobs/notification-job-operations";
import type { NotificationRuleOperations } from "#src/notifications/rules/notification-rule-operations";
import type { NotificationWatchedItems } from "#src/notifications/rules/notification-watched-items";
import type { NotificationGuildTargets } from "#src/notifications/targets/notification-guild-targets";
import type { NotificationUserTargets } from "#src/notifications/targets/notification-user-targets";

export interface NotificationDataServices {
  readonly guildTargets: NotificationGuildTargets;
  readonly userTargets: NotificationUserTargets;
  readonly jobOperations: NotificationJobOperations;
  readonly rules: NotificationRuleOperations;
  readonly watchedItems: NotificationWatchedItems;
}

export class NotificationOperations extends Context.Service<
  NotificationOperations,
  NotificationDataServices
>()("@lootlog/api/http-api/notifications/operations") {}

export const notificationDataLayer = (services: NotificationDataServices) =>
  Layer.succeed(NotificationOperations, NotificationOperations.of(services));
