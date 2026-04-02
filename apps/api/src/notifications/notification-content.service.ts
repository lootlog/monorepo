import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  NotificationScheduleAnchor as DbNotificationScheduleAnchor,
  NotificationTargetType as DbNotificationTargetType,
  NotificationTriggerType as DbNotificationTriggerType,
  NotificationScheduleStrategy as DbNotificationScheduleStrategy,
  Prisma,
} from "prisma/generated/client";
import { PrismaService } from "src/db/prisma.service";
import { GUILD_NOTIFICATION_TIMEZONE } from "src/notifications/constants/notification-schedule-timezone.constant";

const DEFAULT_TIMER_NOTIFICATION_TEMPLATE = [
  "## {{npcName}}",
  "",
  "Swiat: **{{world}}**",
  "Okno spawnu: **{{minSpawnTime}} - {{maxSpawnTime}}**",
  "Zaplanowana wysylka: **{{scheduledFor}}**",
].join("\n");

const DEFAULT_SCHEDULED_MESSAGE_TEMPLATE = [
  "## {{ruleName}}",
  "",
  "Zaplanowana wysylka: **{{scheduledFor}}**",
].join("\n");

@Injectable()
export class NotificationContentService {
  constructor(private readonly prisma: PrismaService) {}

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
      title: "Nadchodzacy spawn",
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
    } satisfies Prisma.InputJsonObject;
  }

  buildScheduledMessagePayload(params: {
    notificationRule: {
      id: number;
      name: string | null;
      triggerType: DbNotificationTriggerType;
      contentTemplate?: string | null;
      scheduleTimezone?: string | null;
    };
    target: {
      targetType: DbNotificationTargetType;
    };
    scheduledFor: Date;
  }) {
    const ruleName = params.notificationRule.name?.trim().length
      ? params.notificationRule.name.trim()
      : "Zaplanowana wiadomosc";
    const message = `Zaplanowana wiadomosc "${ruleName}".`;
    const content = this.renderScheduledMessageContent({
      template:
        params.notificationRule.contentTemplate ??
        DEFAULT_SCHEDULED_MESSAGE_TEMPLATE,
      notificationRuleName: params.notificationRule.name,
      scheduledFor: params.scheduledFor,
      timeZone:
        params.notificationRule.scheduleTimezone ?? GUILD_NOTIFICATION_TIMEZONE,
    });

    return {
      title: "Zaplanowana wiadomosc",
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
    } satisfies Prisma.InputJsonObject;
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
      filters: Prisma.JsonValue;
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
      title: "Powiadomienie",
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
    } satisfies Prisma.InputJsonObject;
  }

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
    } satisfies Prisma.InputJsonObject;
  }

  parseAllowedMentions(value: Prisma.JsonValue | undefined) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }

    const parse = Array.isArray(value.parse)
      ? value.parse.filter(
          (entry): entry is "roles" | "users" | "everyone" =>
            entry === "roles" || entry === "users" || entry === "everyone",
        )
      : undefined;
    const roles = Array.isArray(value.roles)
      ? value.roles.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : undefined;
    const users = Array.isArray(value.users)
      ? value.users.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : undefined;
    const repliedUser =
      typeof value.repliedUser === "boolean" ? value.repliedUser : undefined;

    if (
      (parse?.length ?? 0) === 0 &&
      (roles?.length ?? 0) === 0 &&
      (users?.length ?? 0) === 0 &&
      repliedUser === undefined
    ) {
      return undefined;
    }

    return {
      ...(parse && parse.length > 0 ? { parse } : {}),
      ...(roles && roles.length > 0 ? { roles } : {}),
      ...(users && users.length > 0 ? { users } : {}),
      ...(repliedUser !== undefined ? { repliedUser } : {}),
    };
  }

  formatNotificationDate(date: Date, timeZone?: string) {
    return new Intl.DateTimeFormat("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...(timeZone ? { timeZone } : {}),
    }).format(date);
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
        return `${npcLabel} osiąga maksymalny czas spawnu na świecie ${params.world}.`;
      }

      return `${npcLabel} osiągnie maksymalny czas spawnu na świecie ${params.world} za ${params.scheduleOffsetMinutes} min.`;
    }

    if (params.scheduleOffsetMinutes === 0) {
      return `${npcLabel} osiąga minimalny czas spawnu na świecie ${params.world}.`;
    }

    return `${npcLabel} osiągnie minimalny czas spawnu na świecie ${params.world} za ${params.scheduleOffsetMinutes} min.`;
  }

  private buildRuleTestNotificationMessage(params: {
    ruleName: string | null;
    triggerType: DbNotificationTriggerType;
    world: string | null;
  }) {
    const ruleLabel = params.ruleName?.trim().length
      ? params.ruleName.trim()
      : params.triggerType === DbNotificationTriggerType.TIMER_BEFORE_SPAWN
        ? "Przypomnienie przed spawnem"
        : params.triggerType === DbNotificationTriggerType.SCHEDULED_MESSAGE
          ? "Zaplanowana wiadomosc"
          : "Powiadomienie";

    if (params.world) {
      return `To jest test reguły "${ruleLabel}" dla świata ${params.world}.`;
    }

    return `To jest test reguły "${ruleLabel}".`;
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
        : "Powiadomienie o spawnie",
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
    timeZone: string;
  }) {
    const placeholderValues = {
      ruleName: params.notificationRuleName?.trim().length
        ? params.notificationRuleName.trim()
        : "Zaplanowana wiadomosc",
      scheduledFor: this.formatNotificationDate(
        params.scheduledFor,
        params.timeZone,
      ),
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
      filters: Prisma.JsonValue;
      scheduleAnchor: DbNotificationScheduleAnchor | null;
      scheduleOffsetMinutes: number | null;
    },
    scheduledFor: Date,
  ) {
    if (notificationRule.guildId) {
      const timers = await this.prisma.timer.findMany({
        where: {
          guildId: notificationRule.guildId,
          ...(notificationRule.world ? { world: notificationRule.world } : {}),
        },
        select: {
          npcId: true,
          world: true,
          timerKey: true,
          minSpawnTime: true,
          maxSpawnTime: true,
          npc: true,
        },
        orderBy: [{ minSpawnTime: "asc" }],
        take: 50,
      });

      const filters = this.parseFilters(notificationRule.filters);
      const matchingTimer = timers.find((timer) =>
        this.matchesTimerFilters(filters, timer.npcId),
      );

      if (matchingTimer) {
        return {
          npcId: matchingTimer.npcId,
          npcName:
            matchingTimer.npc &&
            typeof matchingTimer.npc === "object" &&
            !Array.isArray(matchingTimer.npc) &&
            typeof matchingTimer.npc.name === "string"
              ? matchingTimer.npc.name
              : null,
          world: matchingTimer.world,
          timerKey: matchingTimer.timerKey,
          minSpawnTime: matchingTimer.minSpawnTime,
          maxSpawnTime: matchingTimer.maxSpawnTime,
        };
      }
    }

    const filters = this.parseFilters(notificationRule.filters);
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
      npcName: fallbackNpcId > 0 ? null : "Wybrany NPC",
      world: notificationRule.world ?? "Wybrany swiat",
      timerKey: `test-${randomUUID()}`,
      minSpawnTime,
      maxSpawnTime,
    };
  }

  // Used internally for getTimerTestContext filter matching
  private parseFilters(filtersValue: Prisma.JsonValue) {
    if (
      !filtersValue ||
      typeof filtersValue !== "object" ||
      Array.isArray(filtersValue)
    ) {
      return {} as Record<string, unknown>;
    }

    return filtersValue as Record<string, unknown>;
  }

  private matchesTimerFilters(filters: Record<string, unknown>, npcId: number) {
    if (filters.npcId && filters.npcId !== npcId) {
      return false;
    }

    if (
      Array.isArray(filters.npcIds) &&
      filters.npcIds.length > 0 &&
      !filters.npcIds.includes(npcId)
    ) {
      return false;
    }

    return true;
  }
}
