import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  DEFAULT_TIMER_NOTIFICATION_TEMPLATE,
  DEFAULT_SCHEDULED_MESSAGE_TEMPLATE,
  TIMER_NOTIFICATION_TITLE,
  SCHEDULED_MESSAGE_TITLE,
  SCHEDULED_MESSAGE_DEFAULT_NAME,
  GENERIC_NOTIFICATION_TITLE,
  SPAWN_NOTIFICATION_FALLBACK_NAME,
  TIMER_BEFORE_SPAWN_LABEL,
  FALLBACK_NPC_NAME,
  FALLBACK_WORLD_NAME,
  timerMaxSpawnReached,
  timerMaxSpawnIn,
  timerMinSpawnReached,
  timerMinSpawnIn,
  scheduledMessageNotification,
  ruleTestWithWorld,
  ruleTestWithoutWorld,
} from "#src/notifications/constants/notification-messages.constant";
import { NotificationMatchingService } from "#src/notifications/notification-matching.service";
import { formatDiscordRelativeTimestamp } from "#src/notifications/utils/discord-timestamp.util";
import type { JsonObject, JsonValue } from "./notification-database.types.js";
import { NotificationsRepository } from "./notifications.repository.js";

const DbNotificationScheduleAnchor = {
  MAX_SPAWN: "MAX_SPAWN",
  MIN_SPAWN: "MIN_SPAWN",
} as const;
type DbNotificationScheduleAnchor =
  (typeof DbNotificationScheduleAnchor)[keyof typeof DbNotificationScheduleAnchor];
type DbNotificationScheduleStrategy =
  | "FIXED_DATETIME"
  | "SPAWN_WINDOW_RELATIVE";
const DbNotificationTargetType = { CHANNEL: "CHANNEL", DM: "DM" } as const;
type DbNotificationTargetType =
  (typeof DbNotificationTargetType)[keyof typeof DbNotificationTargetType];
const DbNotificationTriggerType = {
  NPC_SPAWNED: "NPC_SPAWNED",
  SCHEDULED_MESSAGE: "SCHEDULED_MESSAGE",
  TIMER_BEFORE_SPAWN: "TIMER_BEFORE_SPAWN",
  WATCHED_ITEM_DROPPED: "WATCHED_ITEM_DROPPED",
} as const;
type DbNotificationTriggerType =
  (typeof DbNotificationTriggerType)[keyof typeof DbNotificationTriggerType];

type AllowedMention = "roles" | "users" | "everyone";

const parseAllowedMentionList = (
  value: JsonValue | undefined,
): AllowedMention[] | undefined =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is AllowedMention =>
          entry === "roles" || entry === "users" || entry === "everyone",
      )
    : undefined;

const parseStringList = (value: JsonValue | undefined): string[] | undefined =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : undefined;

const hasAllowedMentionValues = (params: {
  parse: AllowedMention[] | undefined;
  roles: string[] | undefined;
  users: string[] | undefined;
  repliedUser: boolean | undefined;
}): boolean =>
  (params.parse?.length ?? 0) > 0 ||
  (params.roles?.length ?? 0) > 0 ||
  (params.users?.length ?? 0) > 0 ||
  params.repliedUser !== undefined;

@Injectable()
export class NotificationContentService {
  constructor(
    private readonly repository: NotificationsRepository,
    private readonly matchingService: NotificationMatchingService,
  ) {}

  buildTimerNotificationPayload(params: {
    notificationRule: {
      id: number;
      name: string | null;
      triggerType: DbNotificationTriggerType;
      scheduleStrategy: DbNotificationScheduleStrategy | null;
      scheduleAnchor: DbNotificationScheduleAnchor | null;
      scheduleOffsetMinutes: number | null;
      contentTemplate?: string | null;
    };
    target: {
      targetType: DbNotificationTargetType;
    };
    npcId: number;
    npcName: string | null;
    world: string;
    timerKey: string;
    minSpawnTime: Date;
    maxSpawnTime: Date;
    scheduledFor: Date;
  }) {
    const message = this.buildTimerNotificationMessage({
      npcName: params.npcName,
      npcId: params.npcId,
      world: params.world,
      scheduleAnchor:
        params.notificationRule.scheduleAnchor ??
        DbNotificationScheduleAnchor.MIN_SPAWN,
      scheduleOffsetMinutes: params.notificationRule.scheduleOffsetMinutes ?? 0,
    });
    const content = this.renderTimerNotificationContent({
      template:
        params.notificationRule.contentTemplate ??
        DEFAULT_TIMER_NOTIFICATION_TEMPLATE,
      notificationRuleName: params.notificationRule.name,
      npcId: params.npcId,
      npcName: params.npcName,
      world: params.world,
      minSpawnTime: params.minSpawnTime,
      maxSpawnTime: params.maxSpawnTime,
      scheduledFor: params.scheduledFor,
    });

    return {
      title: TIMER_NOTIFICATION_TITLE,
      message,
      content,
      allowedMentions: this.buildAllowedMentionsForTarget(
        content,
        params.target.targetType,
      ),
      ruleId: params.notificationRule.id,
      ruleName: params.notificationRule.name,
      triggerType: params.notificationRule.triggerType,
      world: params.world,
      npcId: params.npcId,
      npcName: params.npcName,
      timerKey: params.timerKey,
      minSpawnTime: params.minSpawnTime.toISOString(),
      maxSpawnTime: params.maxSpawnTime.toISOString(),
      scheduledFor: params.scheduledFor.toISOString(),
      scheduleStrategy: params.notificationRule.scheduleStrategy,
      scheduleAnchor: params.notificationRule.scheduleAnchor,
      scheduleOffsetMinutes: params.notificationRule.scheduleOffsetMinutes,
      contentTemplate:
        params.notificationRule.contentTemplate ??
        DEFAULT_TIMER_NOTIFICATION_TEMPLATE,
    } satisfies JsonObject;
  }

  buildScheduledMessagePayload(params: {
    notificationRule: {
      id: number;
      name: string | null;
      triggerType: DbNotificationTriggerType;
      contentTemplate?: string | null;
    };
    target: {
      targetType: DbNotificationTargetType;
    };
    scheduledFor: Date;
  }) {
    const ruleName = params.notificationRule.name?.trim().length
      ? params.notificationRule.name.trim()
      : SCHEDULED_MESSAGE_DEFAULT_NAME;
    const message = scheduledMessageNotification(ruleName);
    const content = this.renderScheduledMessageContent({
      template:
        params.notificationRule.contentTemplate ??
        DEFAULT_SCHEDULED_MESSAGE_TEMPLATE,
      notificationRuleName: params.notificationRule.name,
      scheduledFor: params.scheduledFor,
    });

    return {
      title: SCHEDULED_MESSAGE_TITLE,
      message,
      content,
      allowedMentions: this.buildAllowedMentionsForTarget(
        content,
        params.target.targetType,
      ),
      ruleId: params.notificationRule.id,
      ruleName: params.notificationRule.name,
      triggerType: params.notificationRule.triggerType,
      scheduledFor: params.scheduledFor.toISOString(),
      contentTemplate:
        params.notificationRule.contentTemplate ??
        DEFAULT_SCHEDULED_MESSAGE_TEMPLATE,
    } satisfies JsonObject;
  }

  async buildTestNotificationPayload(params: {
    notificationRule: {
      id: number;
      ownerType: string;
      ownerId: string;
      guildId: string | null;
      name: string | null;
      world: string | null;
      triggerType: DbNotificationTriggerType;
      filters: JsonValue | null;
      scheduleStrategy: DbNotificationScheduleStrategy | null;
      scheduleAnchor: DbNotificationScheduleAnchor | null;
      scheduleOffsetMinutes: number | null;
      contentTemplate: string | null;
    };
    scheduledFor: Date;
    targetType: DbNotificationTargetType;
  }) {
    if (
      params.notificationRule.triggerType ===
      DbNotificationTriggerType.TIMER_BEFORE_SPAWN
    ) {
      const timerContext = await this.getTimerTestContext(
        params.notificationRule,
        params.scheduledFor,
      );

      return this.buildTimerNotificationPayload({
        notificationRule: params.notificationRule,
        target: { targetType: params.targetType },
        npcId: timerContext.npcId,
        npcName: timerContext.npcName,
        world: timerContext.world,
        timerKey: timerContext.timerKey,
        minSpawnTime: timerContext.minSpawnTime,
        maxSpawnTime: timerContext.maxSpawnTime,
        scheduledFor: params.scheduledFor,
      });
    }

    return {
      title: GENERIC_NOTIFICATION_TITLE,
      message: this.buildRuleTestNotificationMessage({
        ruleName: params.notificationRule.name,
        triggerType: params.notificationRule.triggerType,
        world: params.notificationRule.world,
      }),
      content: this.buildRuleTestNotificationMessage({
        ruleName: params.notificationRule.name,
        triggerType: params.notificationRule.triggerType,
        world: params.notificationRule.world,
      }),
      ruleId: params.notificationRule.id,
      ruleName: params.notificationRule.name,
      triggerType: params.notificationRule.triggerType,
      world: params.notificationRule.world,
    } satisfies JsonObject;
  }

  /**
   * Builds Discord allowedMentions based on rendered template content.
   * Role mentions (<@&roleId>), @everyone, and @here found in templates are
   * intentionally forwarded — guild admins control templates and are trusted
   * to configure mentions. DM targets skip mentions entirely.
   */
  buildAllowedMentionsForTarget(
    content: string,
    targetType: DbNotificationTargetType,
  ) {
    if (targetType === DbNotificationTargetType.DM) {
      return undefined;
    }

    const roleIds = Array.from(
      new Set(
        Array.from(content.matchAll(/<@&(\d+)>/g))
          .map((match) => match[1])
          .filter((roleId): roleId is string => typeof roleId === "string"),
      ),
    );
    const parse: Array<"everyone"> = [];

    if (content.includes("@everyone") || content.includes("@here")) {
      parse.push("everyone");
    }

    if (roleIds.length === 0 && parse.length === 0) {
      return undefined;
    }

    return {
      ...(parse.length > 0 ? { parse } : {}),
      ...(roleIds.length > 0 ? { roles: roleIds } : {}),
      repliedUser: false,
    } satisfies JsonObject;
  }

  parseAllowedMentions(value: JsonValue | undefined) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }

    const parse = parseAllowedMentionList(value.parse);
    const roles = parseStringList(value.roles);
    const users = parseStringList(value.users);
    const repliedUser =
      typeof value.repliedUser === "boolean" ? value.repliedUser : undefined;

    if (!hasAllowedMentionValues({ parse, roles, users, repliedUser })) {
      return undefined;
    }

    return {
      ...(parse && parse.length > 0 ? { parse } : {}),
      ...(roles && roles.length > 0 ? { roles } : {}),
      ...(users && users.length > 0 ? { users } : {}),
      ...(repliedUser !== undefined ? { repliedUser } : {}),
    };
  }

  formatNotificationDate(date: Date) {
    return formatDiscordRelativeTimestamp(date);
  }

  private buildTimerNotificationMessage(params: {
    npcName: string | null;
    npcId: number;
    world: string;
    scheduleAnchor: DbNotificationScheduleAnchor;
    scheduleOffsetMinutes: number;
  }) {
    const npcLabel = params.npcName ?? `NPC #${params.npcId}`;

    if (params.scheduleAnchor === DbNotificationScheduleAnchor.MAX_SPAWN) {
      if (params.scheduleOffsetMinutes === 0) {
        return timerMaxSpawnReached(npcLabel, params.world);
      }

      return timerMaxSpawnIn(
        npcLabel,
        params.world,
        params.scheduleOffsetMinutes,
      );
    }

    if (params.scheduleOffsetMinutes === 0) {
      return timerMinSpawnReached(npcLabel, params.world);
    }

    return timerMinSpawnIn(
      npcLabel,
      params.world,
      params.scheduleOffsetMinutes,
    );
  }

  private buildRuleTestNotificationMessage(params: {
    ruleName: string | null;
    triggerType: DbNotificationTriggerType;
    world: string | null;
  }) {
    const ruleLabel = params.ruleName?.trim().length
      ? params.ruleName.trim()
      : params.triggerType === DbNotificationTriggerType.TIMER_BEFORE_SPAWN
        ? TIMER_BEFORE_SPAWN_LABEL
        : params.triggerType === DbNotificationTriggerType.SCHEDULED_MESSAGE
          ? SCHEDULED_MESSAGE_DEFAULT_NAME
          : GENERIC_NOTIFICATION_TITLE;

    if (params.world) {
      return ruleTestWithWorld(ruleLabel, params.world);
    }

    return ruleTestWithoutWorld(ruleLabel);
  }

  private renderTimerNotificationContent(params: {
    template: string;
    notificationRuleName: string | null;
    npcId: number;
    npcName: string | null;
    world: string;
    minSpawnTime: Date;
    maxSpawnTime: Date;
    scheduledFor: Date;
  }) {
    const placeholderValues = {
      ruleName: params.notificationRuleName?.trim().length
        ? params.notificationRuleName.trim()
        : SPAWN_NOTIFICATION_FALLBACK_NAME,
      npcName: params.npcName ?? `NPC #${params.npcId}`,
      npcId: String(params.npcId),
      world: params.world,
      minSpawnTime: this.formatNotificationDate(params.minSpawnTime),
      maxSpawnTime: this.formatNotificationDate(params.maxSpawnTime),
      scheduledFor: this.formatNotificationDate(params.scheduledFor),
    } satisfies Record<string, string>;

    return params.template.replaceAll(
      /\{\{(ruleName|npcName|npcId|world|minSpawnTime|maxSpawnTime|scheduledFor)\}\}/g,
      (_match, placeholder) => placeholderValues[placeholder] ?? "",
    );
  }

  private renderScheduledMessageContent(params: {
    template: string;
    notificationRuleName: string | null;
    scheduledFor: Date;
  }) {
    const placeholderValues = {
      ruleName: params.notificationRuleName?.trim().length
        ? params.notificationRuleName.trim()
        : SCHEDULED_MESSAGE_DEFAULT_NAME,
      scheduledFor: this.formatNotificationDate(params.scheduledFor),
    } satisfies Record<string, string>;

    return params.template.replaceAll(
      /\{\{(ruleName|scheduledFor)\}\}/g,
      (_match, placeholder) => placeholderValues[placeholder] ?? "",
    );
  }

  private async getTimerTestContext(
    notificationRule: {
      guildId: string | null;
      world: string | null;
      filters: JsonValue;
      scheduleAnchor: DbNotificationScheduleAnchor | null;
      scheduleOffsetMinutes: number | null;
    },
    scheduledFor: Date,
  ) {
    if (notificationRule.guildId) {
      const timers = await this.repository.findTimersForRule(
        notificationRule.guildId,
        notificationRule.world,
      );

      const matchingTimer = timers.find((timer) =>
        this.matchingService.matchesTimerRule(
          notificationRule.filters,
          timer.npcId,
        ),
      );

      if (matchingTimer) {
        return {
          npcId: matchingTimer.npcId,
          npcName: this.readNpcName(matchingTimer.npc),
          world: matchingTimer.world,
          timerKey: matchingTimer.timerKey,
          minSpawnTime: matchingTimer.minSpawnTime,
          maxSpawnTime: matchingTimer.maxSpawnTime,
        };
      }
    }

    const filters = this.matchingService.parseFilters(notificationRule.filters);
    const fallbackNpcId = filters.npcId ?? filters.npcIds?.[0] ?? 0;
    const anchor = notificationRule.scheduleAnchor;
    const offsetMinutes = notificationRule.scheduleOffsetMinutes ?? 0;
    const minSpawnTime =
      anchor === DbNotificationScheduleAnchor.MAX_SPAWN
        ? new Date(
            scheduledFor.getTime() + Math.max(0, offsetMinutes - 20) * 60_000,
          )
        : new Date(scheduledFor.getTime() + offsetMinutes * 60_000);
    const maxSpawnTime =
      anchor === DbNotificationScheduleAnchor.MAX_SPAWN
        ? new Date(scheduledFor.getTime() + offsetMinutes * 60_000)
        : new Date(minSpawnTime.getTime() + 20 * 60_000);

    return {
      npcId: fallbackNpcId,
      npcName: fallbackNpcId > 0 ? null : FALLBACK_NPC_NAME,
      world: notificationRule.world ?? FALLBACK_WORLD_NAME,
      timerKey: `test-${randomUUID()}`,
      minSpawnTime,
      maxSpawnTime,
    };
  }

  private readNpcName(npc: unknown) {
    if (!npc || typeof npc !== "object" || Array.isArray(npc)) return null;
    const name = (npc as Record<string, unknown>).name;
    return typeof name === "string" ? name : null;
  }
}
