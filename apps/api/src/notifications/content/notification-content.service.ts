import {
  BINGO_DEFAULT_BOARD_SIZE,
  type BingoMilestoneNotificationEvent,
} from "@lootlog/schema/bingo";
import {
  isJsonObject,
  type JsonObject,
  type JsonValue,
} from "#src/database/json";
import {
  BINGO_MILESTONE_TITLE,
  bingoMilestoneLabel,
  bingoMilestoneMessage,
  DEFAULT_BINGO_MILESTONE_TEMPLATE,
  DEFAULT_HERO_SIGHTING_TEMPLATE,
  HERO_SIGHTED_TITLE,
  HERO_SIGHTING_STATE_LABEL,
  heroSightingMessage,
  DEFAULT_TIMER_NOTIFICATION_TEMPLATE,
  DEFAULT_SCHEDULED_MESSAGE_TEMPLATE,
  TIMER_NOTIFICATION_TITLE,
  SCHEDULED_MESSAGE_TITLE,
  SCHEDULED_MESSAGE_DEFAULT_NAME,
  GENERIC_NOTIFICATION_TITLE,
  SPAWN_NOTIFICATION_FALLBACK_NAME,
  TIMER_BEFORE_SPAWN_LABEL,
  timerMaxSpawnReached,
  timerMaxSpawnIn,
  timerMinSpawnReached,
  timerMinSpawnIn,
  scheduledMessageNotification,
  ruleTestWithWorld,
  ruleTestWithoutWorld,
  DEFAULT_LOOT_DRAW_TEMPLATE,
  LOOT_DRAW_RESOLVED_TITLE,
  lootDrawMessage,
  lootDrawOutcomeLine,
} from "#src/notifications/content/notification-messages";
import { formatLootDrawTickets } from "@lootlog/domain/loot-draw";
import { Schema } from "effect";
import { formatDiscordRelativeTimestamp } from "#src/notifications/content/discord-timestamp";
import {
  NotificationScheduleAnchor,
  type DiscordNotificationAllowedMentions,
  type NotificationScheduleStrategy,
  LootDrawOutcome,
  LootDrawResolvedNotificationEventSchema,
  type LootDrawResolvedNotificationEvent,
  NotificationTargetType,
  NotificationTriggerType,
} from "@lootlog/schema/notifications";

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

const fillTemplate = (
  template: string,
  values: Readonly<Record<string, string>>,
) =>
  template.replaceAll(/\{\{(\w+)\}\}/g, (match, name: string) =>
    Object.hasOwn(values, name) ? (values[name] ?? match) : match,
  );

class NotificationContent {
  buildTimerNotificationPayload(params: {
    notificationRule: {
      id: number;
      name: string | null;
      triggerType: NotificationTriggerType;
      scheduleStrategy: NotificationScheduleStrategy | null;
      scheduleAnchor: NotificationScheduleAnchor | null;
      scheduleOffsetMinutes: number | null;
      contentTemplate?: string | null;
    };
    target: {
      targetType: NotificationTargetType;
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
        NotificationScheduleAnchor.MIN_SPAWN,
      scheduleOffsetMinutes: params.notificationRule.scheduleOffsetMinutes ?? 0,
    });

    const template =
      params.notificationRule.contentTemplate ??
      DEFAULT_TIMER_NOTIFICATION_TEMPLATE;

    const content = this.renderTimerNotificationContent({
      template,
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
      ...this.allowedMentionsField(template, params.target.targetType),
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
      triggerType: NotificationTriggerType;
      contentTemplate?: string | null;
    };
    target: {
      targetType: NotificationTargetType;
    };
    scheduledFor: Date;
  }) {
    const ruleName = params.notificationRule.name?.trim().length
      ? params.notificationRule.name.trim()
      : SCHEDULED_MESSAGE_DEFAULT_NAME;

    const message = scheduledMessageNotification(ruleName);

    const template =
      params.notificationRule.contentTemplate ??
      DEFAULT_SCHEDULED_MESSAGE_TEMPLATE;

    const content = this.renderScheduledMessageContent({
      template,
      notificationRuleName: params.notificationRule.name,
      scheduledFor: params.scheduledFor,
    });

    return {
      title: SCHEDULED_MESSAGE_TITLE,
      message,
      content,
      ...this.allowedMentionsField(template, params.target.targetType),
      ruleId: params.notificationRule.id,
      ruleName: params.notificationRule.name,
      triggerType: params.notificationRule.triggerType,
      scheduledFor: params.scheduledFor.toISOString(),
      contentTemplate:
        params.notificationRule.contentTemplate ??
        DEFAULT_SCHEDULED_MESSAGE_TEMPLATE,
    } satisfies JsonObject;
  }

  buildHeroSightingPayload(params: {
    notificationRule: {
      id: number;
      name: string | null;
      triggerType: NotificationTriggerType;
      contentTemplate?: string | null;
    };
    target: {
      targetType: NotificationTargetType;
    };
    sighting: {
      readonly id: number;
      readonly world: string;
      readonly hero: { readonly name: string; readonly lvl: number };
      readonly heroLevel: string;
      readonly mapName: string;
      readonly detectedBy: string;
    };
  }) {
    const { sighting } = params;
    const state = HERO_SIGHTING_STATE_LABEL;

    const template =
      params.notificationRule.contentTemplate ?? DEFAULT_HERO_SIGHTING_TEMPLATE;

    const placeholderValues = {
      ruleName: params.notificationRule.name?.trim() || HERO_SIGHTED_TITLE,
      heroName: sighting.hero.name,
      heroLevel: sighting.heroLevel,
      mapName: sighting.mapName,
      state,
      detectedBy: sighting.detectedBy,
      world: sighting.world,
    } satisfies Record<string, string>;

    const content = fillTemplate(template, placeholderValues);

    return {
      title: HERO_SIGHTED_TITLE,
      message: heroSightingMessage(
        sighting.hero.name,
        state,
        sighting.mapName,
        sighting.world,
      ),
      content,
      ...this.allowedMentionsField(template, params.target.targetType),
      ruleId: params.notificationRule.id,
      ruleName: params.notificationRule.name,
      triggerType: params.notificationRule.triggerType,
      world: sighting.world,
      heroSightingId: sighting.id,
      heroName: sighting.hero.name,
      mapName: sighting.mapName,
      contentTemplate: template,
    } satisfies JsonObject;
  }

  buildLootDrawPayload(params: {
    notificationRule: {
      id: number;
      name: string | null;
      triggerType: NotificationTriggerType;
      contentTemplate?: string | null;
    };
    target: {
      targetType: NotificationTargetType;
    };
    event: LootDrawResolvedNotificationEvent;
  }) {
    const { event } = params;
    const { draw } = event;
    const winner = draw.entrants[draw.winnerIndex];
    const winnerName = winner?.name ?? "";

    const voided =
      event.outcome === LootDrawOutcome.VOIDED ? draw.voided : null;

    const template =
      params.notificationRule.contentTemplate ?? DEFAULT_LOOT_DRAW_TEMPLATE;

    const placeholderValues = {
      ruleName:
        params.notificationRule.name?.trim() || LOOT_DRAW_RESOLVED_TITLE,
      itemName: event.item.name,
      winnerName,
      outcome: lootDrawOutcomeLine(
        winnerName,
        formatLootDrawTickets(winner?.tickets ?? 0),
        voided,
      ),
      drawnBy: draw.drawnBy,
      npcName: event.npcName ?? "",
      world: event.world,
      reason: voided?.reason ?? "",
    } satisfies Record<string, string>;

    return {
      title: LOOT_DRAW_RESOLVED_TITLE,
      message: lootDrawMessage(event.item.name, winnerName, voided !== null),
      content: fillTemplate(template, placeholderValues),
      ...this.allowedMentionsField(template, params.target.targetType),
      ruleId: params.notificationRule.id,
      ruleName: params.notificationRule.name,
      triggerType: params.notificationRule.triggerType,
      world: event.world,
      lootId: event.lootId,
      lootDraw: Schema.encodeSync(LootDrawResolvedNotificationEventSchema)(
        event,
      ),
      contentTemplate: template,
    } satisfies JsonObject;
  }

  buildBingoMilestonePayload(params: {
    notificationRule: {
      id: number;
      name: string | null;
      triggerType: NotificationTriggerType;
      contentTemplate?: string | null;
    };
    target: {
      targetType: NotificationTargetType;
    };
    event: BingoMilestoneNotificationEvent;
  }) {
    const { event } = params;

    const template =
      params.notificationRule.contentTemplate ??
      DEFAULT_BINGO_MILESTONE_TEMPLATE;

    const placeholderValues = {
      ruleName: params.notificationRule.name?.trim() || BINGO_MILESTONE_TITLE,
      boardName: event.boardName,
      memberName: event.memberName,
      tileTitle: event.tileTitle,
      milestoneLabel: bingoMilestoneLabel(event.milestoneKind),
      summary: event.summary,
      completedTileCount: String(event.completedTileCount),
      totalTileCount: String(
        event.totalTileCount ??
          BINGO_DEFAULT_BOARD_SIZE * BINGO_DEFAULT_BOARD_SIZE,
      ),
      completedLinesCount: String(event.completedLinesCount),
      totalPoints: String(event.totalPoints),
      world: event.world ?? "",
    } satisfies Record<string, string>;

    return {
      title: BINGO_MILESTONE_TITLE,
      message: bingoMilestoneMessage(
        event.memberName,
        event.tileTitle,
        event.boardName,
        event.milestoneKind,
      ),
      content: fillTemplate(template, placeholderValues),
      ...this.allowedMentionsField(template, params.target.targetType),
      ruleId: params.notificationRule.id,
      ruleName: params.notificationRule.name,
      triggerType: params.notificationRule.triggerType,
      world: event.world,
      boardId: event.boardId,
      tileId: event.tileId,
      contentTemplate: template,
    } satisfies JsonObject;
  }

  buildGenericTestNotificationPayload(params: {
    notificationRule: {
      id: number;
      ownerType: string;
      ownerId: string;
      guildId: string | null;
      name: string | null;
      world: string | null;
      triggerType: NotificationTriggerType;
      filters: JsonValue | null;
      scheduleStrategy: NotificationScheduleStrategy | null;
      scheduleAnchor: NotificationScheduleAnchor | null;
      scheduleOffsetMinutes: number | null;
      contentTemplate: string | null;
    };
    scheduledFor: Date;
    targetType: NotificationTargetType;
  }) {
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

  private allowedMentionsField(
    template: string,
    targetType: NotificationTargetType,
  ): { allowedMentions?: DiscordNotificationAllowedMentions } {
    const allowedMentions = this.buildAllowedMentionsForTarget(
      template,
      targetType,
    );

    return allowedMentions ? { allowedMentions } : {};
  }

  buildAllowedMentionsForTarget(
    template: string,
    targetType: NotificationTargetType,
  ) {
    if (targetType === NotificationTargetType.DM) {
      return undefined;
    }

    const roleIds = Array.from(
      new Set(
        Array.from(template.matchAll(/<@&(\d+)>/g))
          .map((match) => match[1])
          .filter((roleId): roleId is string => typeof roleId === "string"),
      ),
    );

    const parse: Array<"everyone"> = [];

    if (template.includes("@everyone") || template.includes("@here")) {
      parse.push("everyone");
    }

    if (roleIds.length === 0 && parse.length === 0) {
      return undefined;
    }

    const mentions: DiscordNotificationAllowedMentions = { repliedUser: false };

    if (parse.length > 0) mentions.parse = parse;

    if (roleIds.length > 0) mentions.roles = roleIds;

    return mentions;
  }

  parseAllowedMentions(value: JsonValue | undefined) {
    if (!isJsonObject(value)) {
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

    const mentions: DiscordNotificationAllowedMentions = {};

    if (parse && parse.length > 0) mentions.parse = parse;

    if (roles && roles.length > 0) mentions.roles = roles;

    if (users && users.length > 0) mentions.users = users;

    if (repliedUser !== undefined) mentions.repliedUser = repliedUser;

    return mentions;
  }

  formatNotificationDate(date: Date) {
    return formatDiscordRelativeTimestamp(date);
  }

  private buildTimerNotificationMessage(params: {
    npcName: string | null;
    npcId: number;
    world: string;
    scheduleAnchor: NotificationScheduleAnchor;
    scheduleOffsetMinutes: number;
  }) {
    const npcLabel = params.npcName ?? `NPC #${params.npcId}`;

    if (params.scheduleAnchor === NotificationScheduleAnchor.MAX_SPAWN) {
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
    triggerType: NotificationTriggerType;
    world: string | null;
  }) {
    const ruleLabel = params.ruleName?.trim().length
      ? params.ruleName.trim()
      : params.triggerType === NotificationTriggerType.TIMER_BEFORE_SPAWN
        ? TIMER_BEFORE_SPAWN_LABEL
        : params.triggerType === NotificationTriggerType.SCHEDULED_MESSAGE
          ? SCHEDULED_MESSAGE_DEFAULT_NAME
          : params.triggerType === NotificationTriggerType.HERO_SIGHTED
            ? HERO_SIGHTED_TITLE
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

    return fillTemplate(params.template, placeholderValues);
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

    return fillTemplate(params.template, placeholderValues);
  }
}

export const makeNotificationContent = () => new NotificationContent();

export type NotificationContentModule = ReturnType<
  typeof makeNotificationContent
>;
