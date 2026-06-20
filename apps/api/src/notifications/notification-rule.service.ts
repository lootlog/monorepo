import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationJobKind as DbNotificationJobKind,
  NotificationOwnerType as DbNotificationOwnerType,
  NotificationScheduleAnchor as DbNotificationScheduleAnchor,
  NotificationScheduleIntervalType as DbNotificationScheduleIntervalType,
  NotificationScheduleStrategy as DbNotificationScheduleStrategy,
  NotificationTriggerType as DbNotificationTriggerType,
  Prisma,
} from "src/generated/prisma/client";
import { PrismaService } from "src/db/prisma.service";
import { GuildsService } from "src/guilds/guilds.service";
import { GUILD_NOTIFICATION_TIMEZONE } from "src/notifications/constants/notification-schedule-timezone.constant";
import { NotificationContentService } from "src/notifications/notification-content.service";
import { NotificationFiltersResponseDto } from "src/notifications/dto/notification-response.dto";
import { NotificationJobService } from "src/notifications/notification-job.service";
import { NotificationTargetService } from "src/notifications/notification-target.service";
import { Error } from "src/notifications/enum/error.enum";
import type { CreateNotificationRuleDto } from "src/notifications/dto/create-notification-rule.dto";
import type { UpdateNotificationRuleDto } from "src/notifications/dto/update-notification-rule.dto";
import {
  calculateFirstOccurrenceInTimeZone,
  isValidTimeZone,
} from "src/notifications/utils/notification-schedule-time.util";
import { ensureLimitNotExceeded } from "src/notifications/utils/ensure-limit-not-exceeded.util";
import {
  type TestTriggerUsage,
  computeTestTriggerUsage,
  getDefaultTestTriggerUsage,
  getWorstTestTriggerUsage,
} from "src/notifications/utils/test-trigger-usage.util";

const GUILD_NOTIFICATION_TEST_TRIGGER_LIMIT = 10;
const GUILD_NOTIFICATION_TEST_TRIGGER_WINDOW_MS = 15 * 60_000;
const GUILD_NOTIFICATION_MAX_NPCS_PER_RULE = 5;
const USER_NOTIFICATION_RULE_LIMIT = 50;

@Injectable()
export class NotificationRuleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guildsService: GuildsService,
    private readonly targetService: NotificationTargetService,
    private readonly jobService: NotificationJobService,
    private readonly contentService: NotificationContentService,
  ) {}

  // ── Guild Rules ──────────────────────────────────────────────────────

  async listGuildRules(guildId: string) {
    const [guildSettings, rules] = await Promise.all([
      this.prisma.guild.findUnique({
        where: { id: guildId },
        select: { notificationRuleLimit: true },
      }),
      this.prisma.notificationRule.findMany({
        where: {
          ownerType: DbNotificationOwnerType.GUILD,
          ownerId: guildId,
        },
        include: {
          targets: {
            include: {
              target: true,
            },
          },
        },
        orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
      }),
    ]);

    const allTargetIds = [
      ...new Set(
        rules.flatMap((rule) =>
          rule.targets.map((relation) => relation.target.id),
        ),
      ),
    ];
    const targetUsage = await this.getTargetTestTriggerUsage(allTargetIds);

    return {
      items: rules.map((rule) => {
        const ruleTargetIds = rule.targets.map(
          (relation) => relation.target.id,
        );
        const testTrigger = this.computeRuleTestTriggerFromTargets(
          ruleTargetIds,
          targetUsage,
        );
        return {
          ...this.mapRuleResponse(rule),
          testTrigger,
        };
      }),
      limits: {
        ruleLimit: guildSettings?.notificationRuleLimit ?? 20,
        ruleCount: rules.length,
        maxNpcsPerRule: GUILD_NOTIFICATION_MAX_NPCS_PER_RULE,
        testTriggerLimit: GUILD_NOTIFICATION_TEST_TRIGGER_LIMIT,
        testTriggerWindowSeconds: Math.floor(
          GUILD_NOTIFICATION_TEST_TRIGGER_WINDOW_MS / 1000,
        ),
      },
    };
  }

  async createGuildRule(guildId: string, data: CreateNotificationRuleDto) {
    await this.ensureGuildNotificationPermissions(guildId);
    await this.ensureGuildRuleLimitNotExceeded(guildId);

    const rule = await this.createRule(
      DbNotificationOwnerType.GUILD,
      guildId,
      data,
      { guildId },
    );

    await this.jobService.rebuildJobsForRule(rule.id);

    return this.jobService.getRuleById(rule.id);
  }

  async updateGuildRule(
    guildId: string,
    ruleId: number,
    data: UpdateNotificationRuleDto,
  ) {
    await this.ensureGuildNotificationPermissions(guildId);

    await this.updateRule(DbNotificationOwnerType.GUILD, guildId, ruleId, data);

    await this.jobService.rebuildJobsForRule(ruleId);

    return this.jobService.getRuleById(ruleId);
  }

  deleteGuildRule(guildId: string, ruleId: number) {
    return this.deleteRule(DbNotificationOwnerType.GUILD, guildId, ruleId);
  }

  async rebuildGuildRuleJobs(guildId: string, ruleId: number) {
    await this.ensureRule({
      ownerType: DbNotificationOwnerType.GUILD,
      ownerId: guildId,
      ruleId,
    });

    await this.jobService.rebuildJobsForRule(ruleId);

    return { success: true };
  }

  async triggerGuildRuleTest(guildId: string, ruleId: number) {
    await this.ensureGuildNotificationPermissions(guildId);

    const notificationRule = await this.prisma.notificationRule.findFirst({
      where: {
        id: ruleId,
        ownerType: DbNotificationOwnerType.GUILD,
        ownerId: guildId,
      },
      include: {
        targets: {
          include: {
            target: true,
          },
        },
      },
    });

    if (!notificationRule) {
      throw new NotFoundException(Error.NOTIFICATION_RULE_NOT_FOUND);
    }

    if (!notificationRule.enabled) {
      throw new ConflictException(
        Error.ONLY_ENABLED_RULES_CAN_BE_TEST_TRIGGERED,
      );
    }

    const activeTargets = notificationRule.targets
      .map((relation) => relation.target)
      .filter((target) => target.active && target.canSend);

    if (activeTargets.length === 0) {
      throw new ConflictException(
        Error.NOTIFICATION_RULE_REQUIRES_ACTIVE_SENDABLE_TARGET,
      );
    }

    const targetUsage = await this.getTargetTestTriggerUsage(
      activeTargets.map((t) => t.id),
    );

    const sendableTargets = activeTargets.filter((target) => {
      const usage = targetUsage.get(target.id);
      return !usage || usage.remaining > 0;
    });

    if (sendableTargets.length === 0) {
      const worstUsage = getWorstTestTriggerUsage(targetUsage);
      throw new ConflictException({
        message: Error.TEST_TRIGGER_LIMIT_REACHED_FOR_RULE,
        limit: worstUsage?.limit ?? GUILD_NOTIFICATION_TEST_TRIGGER_LIMIT,
        windowSeconds:
          worstUsage?.windowSeconds ??
          Math.floor(GUILD_NOTIFICATION_TEST_TRIGGER_WINDOW_MS / 1000),
        nextAvailableAt: worstUsage?.nextAvailableAt ?? null,
      });
    }

    const now = new Date();
    const testEventId = `test:${notificationRule.id}:${randomUUID()}`;
    const notificationJobs = await Promise.all(
      sendableTargets.map(async (target) => {
        const testPayload =
          await this.contentService.buildTestNotificationPayload({
            notificationRule,
            scheduledFor: now,
            targetType: target.targetType,
          });

        return this.jobService.createNotificationJob({
          notificationRule,
          target,
          jobKind: DbNotificationJobKind.TEST,
          scheduledFor: now,
          sourceEntityType: "rule-test",
          sourceEntityId: String(notificationRule.id),
          sourceEventId: testEventId,
          payloadSnapshot: {
            ...testPayload,
            testTriggeredAt: now.toISOString(),
            source: "rule-test",
          },
        });
      }),
    );

    const createdJobs = notificationJobs.filter(
      (
        notificationJob,
      ): notificationJob is NonNullable<typeof notificationJob> =>
        notificationJob !== null,
    );

    await Promise.all(
      createdJobs.map((notificationJob) =>
        this.jobService.enqueueNotificationJob(notificationJob.id, 0),
      ),
    );

    if (createdJobs.length === 0) {
      throw new ConflictException(Error.NO_TEST_JOBS_CREATED_FOR_RULE);
    }

    return { success: true };
  }

  // ── User Rules ───────────────────────────────────────────────────────

  listUserRules(discordId: string) {
    return this.prisma.notificationRule
      .findMany({
        where: {
          ownerType: DbNotificationOwnerType.USER,
          ownerId: discordId,
        },
        include: {
          targets: {
            include: {
              target: true,
            },
          },
        },
        orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
      })
      .then((rules) => rules.map((rule) => this.mapRuleResponse(rule)));
  }

  async createUserRule(discordId: string, data: CreateNotificationRuleDto) {
    await this.ensureUserRuleLimitNotExceeded(discordId);

    const rule = await this.createRule(
      DbNotificationOwnerType.USER,
      discordId,
      data,
    );

    return this.jobService.getRuleById(rule.id);
  }

  async updateUserRule(
    discordId: string,
    ruleId: number,
    data: UpdateNotificationRuleDto,
  ) {
    await this.updateRule(
      DbNotificationOwnerType.USER,
      discordId,
      ruleId,
      data,
    );

    return this.jobService.getRuleById(ruleId);
  }

  deleteUserRule(discordId: string, ruleId: number) {
    return this.deleteRule(DbNotificationOwnerType.USER, discordId, ruleId);
  }

  // ── Core CRUD (shared by Guild & User) ──────────────────────────────

  private async createRule(
    ownerType: DbNotificationOwnerType,
    ownerId: string,
    data: CreateNotificationRuleDto,
    options?: { guildId?: string },
  ) {
    const isScheduledMessage =
      (data.triggerType as string) ===
      DbNotificationTriggerType.SCHEDULED_MESSAGE;

    if (!isScheduledMessage) {
      this.validateRuleNpcSelection(data);
    }

    const targetIds = await this.targetService.validateTargetIds({
      ownerType,
      ownerId,
      targetIds: data.targetIds,
    });

    return this.prisma.notificationRule.create({
      data: {
        ownerType,
        ownerId,
        triggerType: data.triggerType as DbNotificationTriggerType,
        guildId: options?.guildId ?? null,
        world: isScheduledMessage ? null : (data.world ?? null),
        name: data.name ?? null,
        filters: isScheduledMessage ? Prisma.DbNull : this.buildFilters(data),
        contentTemplate: this.normalizeContentTemplate(data.contentTemplate),
        ...this.resolveScheduleConfig({
          triggerType: data.triggerType as DbNotificationTriggerType,
          data,
        }),
        ...this.resolveScheduledMessageFields({
          ownerType,
          data: isScheduledMessage ? data : null,
        }),
        enabled: data.enabled ?? true,
        dedupeWindowSeconds: 0,
        targets: {
          createMany: {
            data: targetIds.map((targetId) => ({ targetId })),
          },
        },
      },
    });
  }

  private async updateRule(
    ownerType: DbNotificationOwnerType,
    ownerId: string,
    ruleId: number,
    data: UpdateNotificationRuleDto,
  ) {
    const hasName = Object.prototype.hasOwnProperty.call(data, "name");
    const hasWorld = Object.prototype.hasOwnProperty.call(data, "world");
    const hasContentTemplate = Object.prototype.hasOwnProperty.call(
      data,
      "contentTemplate",
    );
    const existingRule = await this.ensureRule({ ownerType, ownerId, ruleId });
    const nextTriggerType =
      (data.triggerType as DbNotificationTriggerType | undefined) ??
      existingRule.triggerType;
    const isScheduledMessage =
      nextTriggerType === DbNotificationTriggerType.SCHEDULED_MESSAGE;
    const hasFilterSelectionUpdate =
      data.npcId !== undefined ||
      data.npcIds !== undefined ||
      data.itemId !== undefined ||
      data.itemIds !== undefined;

    if (!isScheduledMessage) {
      this.validateRuleNpcSelection(data);
    }

    const targetIds = data.targetIds
      ? await this.targetService.validateTargetIds({
          ownerType,
          ownerId,
          targetIds: data.targetIds,
        })
      : null;

    let nextWorld = existingRule.world;

    if (isScheduledMessage) {
      nextWorld = null;
    } else if (hasWorld) {
      nextWorld = data.world ?? null;
    }

    let nextFilters:
      | Prisma.InputJsonObject
      | Prisma.JsonValue
      | typeof Prisma.DbNull = existingRule.filters;

    if (isScheduledMessage) {
      nextFilters = Prisma.DbNull;
    } else if (hasFilterSelectionUpdate) {
      nextFilters = this.buildFilters(data);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.notificationRule.update({
        where: { id: ruleId },
        data: {
          triggerType: nextTriggerType,
          world: nextWorld,
          name: hasName ? (data.name ?? null) : existingRule.name,
          contentTemplate: hasContentTemplate
            ? this.normalizeContentTemplate(data.contentTemplate)
            : existingRule.contentTemplate,
          filters: nextFilters,
          ...this.resolveScheduleConfig({
            triggerType: nextTriggerType,
            data,
            existingRule,
          }),
          ...this.resolveScheduledMessageFields({
            ownerType,
            data: isScheduledMessage ? data : null,
            existingRule: isScheduledMessage
              ? {
                  scheduledAt: existingRule.scheduledAt,
                  scheduleIntervalType: existingRule.scheduleIntervalType,
                  scheduleIntervalValue: existingRule.scheduleIntervalValue,
                  scheduleWeekday: existingRule.scheduleWeekday,
                  scheduleTimeOfDay: existingRule.scheduleTimeOfDay,
                  scheduledUntil: existingRule.scheduledUntil,
                  scheduleTimezone: existingRule.scheduleTimezone,
                }
              : undefined,
          }),
          enabled: data.enabled ?? existingRule.enabled,
          dedupeWindowSeconds: existingRule.dedupeWindowSeconds,
        },
      });

      if (targetIds) {
        await tx.notificationRuleTarget.deleteMany({
          where: { ruleId },
        });
        await tx.notificationRuleTarget.createMany({
          data: targetIds.map((targetId) => ({ ruleId, targetId })),
          skipDuplicates: true,
        });
      }
    });
  }

  private async deleteRule(
    ownerType: DbNotificationOwnerType,
    ownerId: string,
    ruleId: number,
  ) {
    await this.ensureRule({ ownerType, ownerId, ruleId });
    await this.jobService.cancelPendingJobs({ ruleId });
    await this.prisma.notificationRule.delete({ where: { id: ruleId } });
    return { success: true };
  }

  // ── Private helpers ──────────────────────────────────────────────────

  private async ensureGuildNotificationPermissions(guildId: string) {
    const syncState = await this.guildsService.getGuildDiscordSyncStatus(
      guildId,
      {
        refreshIfStale: true,
      },
    );

    if (!syncState.hasRequiredPermissions) {
      throw new ConflictException({
        message: Error.DISCORD_BOT_MISSING_REQUIRED_PERMISSIONS,
        missingPermissions: syncState.missingPermissions,
        syncState,
      });
    }

    return syncState;
  }

  private async ensureGuildRuleLimitNotExceeded(guildId: string) {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      select: { notificationRuleLimit: true },
    });

    if (!guild) {
      throw new NotFoundException(Error.GUILD_NOT_FOUND);
    }

    const currentRuleCount = await this.prisma.notificationRule.count({
      where: {
        ownerType: DbNotificationOwnerType.GUILD,
        ownerId: guildId,
      },
    });

    ensureLimitNotExceeded({
      currentCount: currentRuleCount,
      limit: guild.notificationRuleLimit,
      errorMessage: Error.GUILD_NOTIFICATION_RULE_LIMIT_REACHED,
      metadata: {
        ruleLimit: guild.notificationRuleLimit,
        ruleCount: currentRuleCount,
      },
    });
  }

  private async ensureUserRuleLimitNotExceeded(discordId: string) {
    const currentRuleCount = await this.prisma.notificationRule.count({
      where: {
        ownerType: DbNotificationOwnerType.USER,
        ownerId: discordId,
      },
    });

    ensureLimitNotExceeded({
      currentCount: currentRuleCount,
      limit: USER_NOTIFICATION_RULE_LIMIT,
      errorMessage: Error.USER_NOTIFICATION_RULE_LIMIT_REACHED,
      metadata: {
        ruleLimit: USER_NOTIFICATION_RULE_LIMIT,
        ruleCount: currentRuleCount,
      },
    });
  }

  private async ensureRule(params: {
    ownerType: DbNotificationOwnerType;
    ownerId: string;
    ruleId: number;
  }) {
    const notificationRule = await this.prisma.notificationRule.findFirst({
      where: {
        id: params.ruleId,
        ownerType: params.ownerType,
        ownerId: params.ownerId,
      },
    });

    if (!notificationRule) {
      throw new NotFoundException(Error.NOTIFICATION_RULE_NOT_FOUND);
    }

    return notificationRule;
  }

  private validateRuleNpcSelection(
    data: Pick<
      CreateNotificationRuleDto | UpdateNotificationRuleDto,
      "npcId" | "npcIds"
    >,
  ) {
    const uniqueNpcIds = new Set<number>();

    if (typeof data.npcId === "number") {
      uniqueNpcIds.add(data.npcId);
    }

    if (Array.isArray(data.npcIds)) {
      for (const npcId of data.npcIds) {
        uniqueNpcIds.add(npcId);
      }
    }

    if (uniqueNpcIds.size > GUILD_NOTIFICATION_MAX_NPCS_PER_RULE) {
      throw new BadRequestException({
        message: Error.NOTIFICATION_RULE_MAX_NPCS_EXCEEDED,
        maxNpcsPerRule: GUILD_NOTIFICATION_MAX_NPCS_PER_RULE,
      });
    }
  }

  private buildFilters(
    data: Pick<
      CreateNotificationRuleDto | UpdateNotificationRuleDto,
      "npcId" | "npcIds" | "itemId" | "itemIds"
    > & {
      guildIds?: string[];
    },
  ): Prisma.InputJsonObject {
    const filters: Record<string, Prisma.InputJsonValue> = {};

    if (data.guildIds !== undefined) {
      filters.guildIds = data.guildIds;
    }

    if (data.npcId !== undefined) {
      filters.npcId = data.npcId;
    }

    if (data.npcIds !== undefined) {
      filters.npcIds = data.npcIds;
    }

    if (data.itemId !== undefined) {
      filters.itemId = data.itemId;
    }

    if (data.itemIds !== undefined) {
      filters.itemIds = data.itemIds;
    }

    return filters as Prisma.InputJsonObject;
  }

  private normalizeContentTemplate(contentTemplate?: string | null) {
    if (typeof contentTemplate !== "string") {
      return null;
    }

    const trimmedContentTemplate = contentTemplate.trim();

    return trimmedContentTemplate.length > 0 ? trimmedContentTemplate : null;
  }

  private resolveScheduleConfig(params: {
    triggerType: DbNotificationTriggerType;
    data: Pick<
      CreateNotificationRuleDto | UpdateNotificationRuleDto,
      "scheduleStrategy" | "scheduleAnchor" | "scheduleOffsetMinutes"
    >;
    existingRule?: {
      scheduleStrategy: DbNotificationScheduleStrategy | null;
      scheduleAnchor: DbNotificationScheduleAnchor | null;
      scheduleOffsetMinutes: number | null;
    };
  }) {
    if (params.triggerType === DbNotificationTriggerType.SCHEDULED_MESSAGE) {
      return {
        scheduleStrategy: DbNotificationScheduleStrategy.FIXED_DATETIME,
        scheduleAnchor: null,
        scheduleOffsetMinutes: null,
      };
    }

    if (params.triggerType !== DbNotificationTriggerType.TIMER_BEFORE_SPAWN) {
      return {
        scheduleStrategy: null,
        scheduleAnchor: null,
        scheduleOffsetMinutes: null,
      };
    }

    const scheduleStrategy =
      (params.data.scheduleStrategy as
        | DbNotificationScheduleStrategy
        | undefined) ??
      params.existingRule?.scheduleStrategy ??
      null;
    const scheduleAnchor =
      (params.data.scheduleAnchor as
        | DbNotificationScheduleAnchor
        | undefined) ??
      params.existingRule?.scheduleAnchor ??
      null;
    const scheduleOffsetMinutes =
      params.data.scheduleOffsetMinutes ??
      params.existingRule?.scheduleOffsetMinutes ??
      null;

    if (
      scheduleStrategy !== DbNotificationScheduleStrategy.SPAWN_WINDOW_RELATIVE
    ) {
      throw new BadRequestException(
        Error.TIMER_NOTIFICATION_REQUIRES_SPAWN_WINDOW_RELATIVE_STRATEGY,
      );
    }

    if (
      scheduleAnchor !== DbNotificationScheduleAnchor.MIN_SPAWN &&
      scheduleAnchor !== DbNotificationScheduleAnchor.MAX_SPAWN
    ) {
      throw new BadRequestException(
        Error.TIMER_NOTIFICATION_REQUIRES_VALID_SCHEDULE_ANCHOR,
      );
    }

    if (scheduleOffsetMinutes === null || scheduleOffsetMinutes < 0) {
      throw new BadRequestException(
        Error.TIMER_NOTIFICATION_REQUIRES_NON_NEGATIVE_SCHEDULE_OFFSET,
      );
    }

    return {
      scheduleStrategy,
      scheduleAnchor,
      scheduleOffsetMinutes,
    };
  }

  private resolveScheduledMessageFields(params: {
    ownerType: DbNotificationOwnerType;
    data: Pick<
      CreateNotificationRuleDto | UpdateNotificationRuleDto,
      | "scheduledAt"
      | "scheduleIntervalType"
      | "scheduleIntervalValue"
      | "scheduleWeekday"
      | "scheduleTimeOfDay"
      | "scheduledUntil"
      | "scheduleTimezone"
    > | null;
    existingRule?: {
      scheduledAt: Date | null;
      scheduleIntervalType: DbNotificationScheduleIntervalType | null;
      scheduleIntervalValue: number | null;
      scheduleWeekday: number | null;
      scheduleTimeOfDay: string | null;
      scheduledUntil: Date | null;
      scheduleTimezone: string | null;
    };
  }) {
    const { data, existingRule, ownerType } = params;

    if (!data) {
      return {
        scheduledAt: null,
        scheduleIntervalType: null,
        scheduleIntervalValue: null,
        scheduleWeekday: null,
        scheduleTimeOfDay: null,
        scheduledUntil: null,
        scheduleTimezone: null,
      };
    }

    const intervalType =
      (data.scheduleIntervalType as
        | DbNotificationScheduleIntervalType
        | undefined) ??
      existingRule?.scheduleIntervalType ??
      DbNotificationScheduleIntervalType.ONCE;
    const intervalValue =
      data.scheduleIntervalValue ?? existingRule?.scheduleIntervalValue ?? null;
    const weekday =
      data.scheduleWeekday ?? existingRule?.scheduleWeekday ?? null;
    const timeOfDay =
      data.scheduleTimeOfDay ?? existingRule?.scheduleTimeOfDay ?? null;
    const hasScheduledUntil = Object.prototype.hasOwnProperty.call(
      data,
      "scheduledUntil",
    );
    let scheduledUntil = existingRule?.scheduledUntil ?? null;

    if (hasScheduledUntil) {
      scheduledUntil = data.scheduledUntil
        ? new Date(data.scheduledUntil)
        : null;
    }

    const scheduleTimezone = this.resolveNotificationScheduleTimeZone({
      ownerType,
      providedTimeZone: data.scheduleTimezone,
      existingTimeZone: existingRule?.scheduleTimezone ?? null,
    });

    if (
      ownerType === DbNotificationOwnerType.USER &&
      (intervalType === DbNotificationScheduleIntervalType.DAILY ||
        intervalType === DbNotificationScheduleIntervalType.WEEKLY) &&
      !scheduleTimezone
    ) {
      throw new BadRequestException(
        Error.RECURRING_USER_SCHEDULED_MESSAGES_REQUIRE_TIMEZONE,
      );
    }

    let scheduledAt: Date | null = null;

    if (data.scheduledAt) {
      scheduledAt = new Date(data.scheduledAt);
    } else if (existingRule?.scheduledAt) {
      scheduledAt = existingRule.scheduledAt;
    }

    if (
      !scheduledAt &&
      (intervalType === DbNotificationScheduleIntervalType.DAILY ||
        intervalType === DbNotificationScheduleIntervalType.WEEKLY) &&
      timeOfDay &&
      scheduleTimezone
    ) {
      scheduledAt = calculateFirstOccurrenceInTimeZone({
        intervalType,
        timeOfDay,
        weekday,
        timeZone: scheduleTimezone,
      });
    }

    return {
      scheduledAt,
      scheduleIntervalType: intervalType,
      scheduleIntervalValue: intervalValue,
      scheduleWeekday: weekday,
      scheduleTimeOfDay: timeOfDay,
      scheduledUntil,
      scheduleTimezone,
    };
  }

  private resolveNotificationScheduleTimeZone(params: {
    ownerType: DbNotificationOwnerType;
    providedTimeZone?: string | null;
    existingTimeZone?: string | null;
  }) {
    const normalizedTimeZone = params.providedTimeZone?.trim() ?? "";

    if (normalizedTimeZone.length > 0) {
      if (!isValidTimeZone(normalizedTimeZone)) {
        throw new BadRequestException(
          Error.INVALID_NOTIFICATION_SCHEDULE_TIMEZONE,
        );
      }

      return normalizedTimeZone;
    }

    if (params.existingTimeZone) {
      return params.existingTimeZone;
    }

    if (params.ownerType === DbNotificationOwnerType.GUILD) {
      return GUILD_NOTIFICATION_TIMEZONE;
    }

    return null;
  }

  private getTargetTestTriggerUsage(targetIds: number[]) {
    return computeTestTriggerUsage(
      this.prisma,
      targetIds,
      GUILD_NOTIFICATION_TEST_TRIGGER_LIMIT,
      GUILD_NOTIFICATION_TEST_TRIGGER_WINDOW_MS,
    );
  }

  private computeRuleTestTriggerFromTargets(
    targetIds: number[],
    targetUsage: Map<number, TestTriggerUsage>,
  ) {
    const defaultUsage = getDefaultTestTriggerUsage(
      GUILD_NOTIFICATION_TEST_TRIGGER_LIMIT,
      GUILD_NOTIFICATION_TEST_TRIGGER_WINDOW_MS,
    );

    if (targetIds.length === 0) {
      return defaultUsage;
    }

    return getWorstTestTriggerUsage(targetUsage, targetIds) ?? defaultUsage;
  }

  private mapRuleResponse<
    T extends {
      filters: Prisma.JsonValue | null;
    },
  >(rule: T) {
    return {
      ...rule,
      filters: this.parseNotificationFilters(rule.filters),
    };
  }

  private parseNotificationFilters(filters: Prisma.JsonValue | null) {
    if (filters === null) {
      return null;
    }

    return NotificationFiltersResponseDto.schema.parse(filters);
  }
}
