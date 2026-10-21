import { addDays, getLocalDate, type LocalDate } from "@lootlog/datetime";
import {
  FACTION_WAR_TIMEZONE,
  FACTION_WARS,
  type FactionWar,
  factionWarDay,
  factionWarStandings,
  factionWarWinners,
  isFactionWarRunning,
} from "@lootlog/domain/faction-war";
import {
  and,
  countDistinct,
  eq,
  gt,
  inArray,
  isNull,
  lte,
  ne,
  sum,
} from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  factionWarDailyPointsTable,
  factionWarPickTable,
  guildTable,
  notificationJobTable,
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
} from "#src/database/drizzle/schema";
import {
  type FactionWarAnnouncementContent,
  factionWarDailyContent,
  factionWarEndedContent,
  factionWarStartedContent,
} from "#src/notifications/content/faction-war-announcement-content";
import {
  enqueuePendingNotificationJob,
  type NotificationJobInput,
  type NotificationJobScheduler,
  notificationJobIdempotencyKey,
} from "#src/notifications/jobs/notification-job-scheduler";
import {
  NotificationJobKind,
  NotificationJobStatus,
  NotificationOwnerType,
  NotificationTargetType,
  NotificationTriggerType,
} from "#src/notifications/notification-enums";

/** `sourceEntityType` of faction war announcement jobs. */
export const FACTION_WAR_NOTIFICATION_SOURCE = "faction-war";

const DAY_MS = 24 * 60 * 60_000;

// A rule created later than this after the end gets no stale result.
const ENDED_ANNOUNCEMENT_WINDOW_MS = DAY_MS;

// Announcements due on the same tick reach a channel in this order.
const EVENT_DELAY_MS = { STARTED: 0, DAILY: 30_000, ENDED: 60_000 } as const;

type FactionWarAnnouncement =
  | { readonly event: "STARTED"; readonly war: FactionWar }
  | {
      readonly event: "DAILY";
      readonly war: FactionWar;
      /** The finished Warsaw day being summarised, `YYYY-MM-DD`. */
      readonly day: string;
      /** The Warsaw day the summary is sent on. */
      readonly today: string;
    }
  | { readonly event: "ENDED"; readonly war: FactionWar };

const formatLocalDate = ({ year, month, day }: LocalDate) =>
  [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");

/** The last Warsaw day of a war; `endsAt` is exclusive. */
const lastWarDay = (war: FactionWar) =>
  factionWarDay(new Date(Date.parse(war.endsAt) - 1));

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

const announcementId = (announcement: FactionWarAnnouncement) =>
  [
    announcement.war.id,
    announcement.event,
    ...(announcement.event === "DAILY" ? [announcement.day] : []),
  ].join(":");

/**
 * Announcements due at `at`: the start while a war runs, each finished
 * Warsaw day of a war on the day after it (the last one included), and the
 * result during the first day after the end.
 */
const dueFactionWarAnnouncements = (
  at: number,
  wars: readonly FactionWar[] = FACTION_WARS,
): FactionWarAnnouncement[] => {
  const todayDate = getLocalDate(new Date(at), FACTION_WAR_TIMEZONE);
  const today = formatLocalDate(todayDate);
  const yesterday = formatLocalDate(addDays(todayDate, -1));

  return wars.flatMap((war): FactionWarAnnouncement[] => {
    const endsAt = Date.parse(war.endsAt);

    return [
      ...(isFactionWarRunning(war, at)
        ? [{ event: "STARTED" as const, war }]
        : []),
      ...(factionWarDay(new Date(war.startsAt)) <= yesterday &&
      yesterday <= lastWarDay(war)
        ? [{ event: "DAILY" as const, war, day: yesterday, today }]
        : []),
      ...(endsAt <= at && at < endsAt + ENDED_ANNOUNCEMENT_WINDOW_MS
        ? [{ event: "ENDED" as const, war }]
        : []),
    ];
  });
};

export const makeFactionWarAnnouncements = (options: {
  readonly database: ApiDatabaseValue;
  readonly scheduler: Pick<NotificationJobScheduler, "create" | "enqueue">;
  readonly webAppUrl: URL;
  readonly wars?: readonly FactionWar[];
}) => {
  const { database, scheduler } = options;
  const pageUrl = new URL("/@me/faction-war", options.webAppUrl).toString();

  // Enabled Organization rules bound to sendable channels of the same
  // Organization, while that Organization still exists.
  const findSubscriptions = () =>
    database
      .select({
        ruleId: notificationRuleTable.id,
        ownerId: notificationRuleTable.ownerId,
        guildId: notificationRuleTable.guildId,
        targetId: notificationTargetTable.id,
        externalId: notificationTargetTable.externalId,
      })
      .from(notificationRuleTable)
      .innerJoin(
        notificationRuleTargetTable,
        eq(notificationRuleTargetTable.ruleId, notificationRuleTable.id),
      )
      .innerJoin(
        notificationTargetTable,
        and(
          eq(notificationTargetTable.id, notificationRuleTargetTable.targetId),
          eq(notificationTargetTable.ownerType, NotificationOwnerType.GUILD),
          eq(notificationTargetTable.ownerId, notificationRuleTable.ownerId),
          eq(
            notificationTargetTable.targetType,
            NotificationTargetType.CHANNEL,
          ),
          eq(notificationTargetTable.active, true),
          eq(notificationTargetTable.canSend, true),
        ),
      )
      .innerJoin(
        guildTable,
        and(
          eq(guildTable.id, notificationRuleTable.ownerId),
          eq(guildTable.active, true),
        ),
      )
      .where(
        and(
          eq(
            notificationRuleTable.triggerType,
            NotificationTriggerType.FACTION_WAR,
          ),
          eq(notificationRuleTable.ownerType, NotificationOwnerType.GUILD),
          eq(notificationRuleTable.enabled, true),
        ),
      );

  const existingKeys = (keys: readonly string[]) =>
    keys.length === 0
      ? Effect.succeed(new Set<string>())
      : database
          .select({ key: notificationJobTable.idempotencyKey })
          .from(notificationJobTable)
          .where(
            and(
              inArray(notificationJobTable.idempotencyKey, [...keys]),
              // A canceled announcement, as by a rule edit, is created again.
              ne(notificationJobTable.status, NotificationJobStatus.CANCELED),
            ),
          )
          .pipe(Effect.map((rows) => new Set(rows.map(({ key }) => key))));

  // Daily raw points and active players of counted picks, through `day`.
  const standingsThrough = (war: FactionWar, day: string) =>
    database
      .select({
        day: factionWarDailyPointsTable.day,
        faction: factionWarPickTable.faction,
        points: sum(factionWarDailyPointsTable.points).mapWith(Number),
        activePlayers: countDistinct(factionWarDailyPointsTable.userId),
      })
      .from(factionWarDailyPointsTable)
      .innerJoin(
        factionWarPickTable,
        and(
          eq(factionWarPickTable.warId, factionWarDailyPointsTable.warId),
          eq(factionWarPickTable.userId, factionWarDailyPointsTable.userId),
          isNull(factionWarPickTable.disqualifiedAt),
        ),
      )
      .where(
        and(
          eq(factionWarDailyPointsTable.warId, war.id),
          lte(factionWarDailyPointsTable.day, day),
          // Zero rows add no points and make nobody active.
          gt(factionWarDailyPointsTable.points, 0),
        ),
      )
      .groupBy(factionWarDailyPointsTable.day, factionWarPickTable.faction)
      .pipe(Effect.map((stats) => factionWarStandings(war, stats)));

  const render = (
    announcement: FactionWarAnnouncement,
  ): Effect.Effect<FactionWarAnnouncementContent, unknown> => {
    const { war } = announcement;

    if (announcement.event === "STARTED") {
      return Effect.succeed(factionWarStartedContent(war, pageUrl));
    }

    if (announcement.event === "ENDED") {
      return standingsThrough(war, lastWarDay(war)).pipe(
        Effect.map(({ score }) =>
          factionWarEndedContent(
            war,
            { score, winners: factionWarWinners(score, war.factions) },
            pageUrl,
          ),
        ),
      );
    }

    return standingsThrough(war, announcement.day).pipe(
      Effect.map((standings) => {
        const day = standings.days.filter(
          (row) => row.day === announcement.day,
        );

        // A day nobody scored has no rows: no points, nobody active, no bonus.
        const ofDay = (
          field: "score" | "activePlayers" | "multiplier",
          none: number,
        ) => ({
          BARBATOS:
            day.find((row) => row.faction === "BARBATOS")?.[field] ?? none,
          TANROTH:
            day.find((row) => row.faction === "TANROTH")?.[field] ?? none,
        });

        return factionWarDailyContent(
          war,
          {
            day: announcement.day,
            score: standings.score,
            dayScore: ofDay("score", 0),
            activePlayers: ofDay("activePlayers", 0),
            multipliers: ofDay("multiplier", 1),
            daysLeft: Math.max(
              0,
              daysBetween(announcement.today, lastWarDay(war)) + 1,
            ),
          },
          pageUrl,
        );
      }),
    );
  };

  const jobInput = (
    announcement: FactionWarAnnouncement,
    subscription: Effect.Success<ReturnType<typeof findSubscriptions>>[number],
    scheduledFor: Date,
    payloadSnapshot: NotificationJobInput["payloadSnapshot"],
  ): NotificationJobInput => {
    const id = announcementId(announcement);

    return {
      notificationRule: {
        id: subscription.ruleId,
        ownerType: NotificationOwnerType.GUILD,
        ownerId: subscription.ownerId,
        guildId: subscription.guildId,
        triggerType: NotificationTriggerType.FACTION_WAR,
      },
      target: {
        id: subscription.targetId,
        externalId: subscription.externalId,
        targetType: NotificationTargetType.CHANNEL,
        active: true,
        canSend: true,
      },
      jobKind: NotificationJobKind.INSTANT,
      scheduledFor,
      sourceEntityType: FACTION_WAR_NOTIFICATION_SOURCE,
      sourceEntityId: id,
      // Keys the job `instant:<ruleId>:<targetId>:factionwar:<id>`, so every
      // replica's tick creates one job per announcement, rule and channel.
      sourceEventId: `factionwar:${id}`,
      payloadSnapshot,
    };
  };

  /**
   * Creates each due announcement once per rule and channel. Replicas run
   * this concurrently; the job idempotency key keeps one job.
   */
  return Effect.fn("notifications.factionWar.announce")(function* (at: number) {
    const due = dueFactionWarAnnouncements(at, options.wars);

    if (due.length === 0) return;
    const targets = yield* findSubscriptions();

    if (targets.length === 0) return;

    const candidates = due.flatMap((announcement) =>
      targets.map((subscription) => ({
        announcement,
        subscription,
        key: notificationJobIdempotencyKey(
          jobInput(announcement, subscription, new Date(at), {}),
        ),
      })),
    );

    const existing = yield* existingKeys(candidates.map(({ key }) => key));

    const missing = Map.groupBy(
      candidates.filter(({ key }) => !existing.has(key)),
      ({ announcement }) => announcement,
    );

    for (const [announcement, pending] of missing) {
      const { title, content } = yield* render(announcement);
      const scheduledFor = new Date(at + EVENT_DELAY_MS[announcement.event]);

      const payload = {
        title,
        message: title,
        content,
        triggerType: NotificationTriggerType.FACTION_WAR,
        warId: announcement.war.id,
        event: announcement.event,
        day: announcement.event === "DAILY" ? announcement.day : null,
      };

      for (const { subscription } of pending) {
        const job = yield* scheduler.create(
          jobInput(announcement, subscription, scheduledFor, payload),
        );

        yield* enqueuePendingNotificationJob(scheduler, job, scheduledFor);
      }
    }
  });
};
