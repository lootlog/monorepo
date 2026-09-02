import { randomUUID } from "node:crypto";
import {
  and,
  arrayOverlaps,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { Effect, Layer } from "effect";
import { resolveReservationSettings } from "@lootlog/domain/reservations";
import { Permission } from "@lootlog/schema/permissions";
import type { ReservationChangedEventV2 } from "@lootlog/schema/reservation-events";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  notificationJobTable,
  notificationRuleTable,
  notificationRuleTargetTable,
  notificationTargetTable,
  reservationShareTable,
  reservationTable,
  roleTable,
} from "#src/database/drizzle/schema";
import { NotificationJobKind } from "#src/notifications/notification-enums";
import { formatDiscordRelativeTimestamp } from "#src/notifications/utils/discord-timestamp.util";
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from "#src/shared/http/http-errors";
import type {
  CreateReservationDto,
  UpdateReservationDto,
} from "#src/http-api/lootlog-api";
import {
  getDiscordAvatarUrl,
  presentReservation,
} from "#src/reservations/reservation-presentation";
import { validateReservationTime } from "#src/reservations/reservation-policy";
import {
  canModerateReservations,
  type ReservationViewerContext,
} from "#src/reservations/reservation-viewer";
import {
  ReservationsRolesData,
  ReservationsRolesOperationError,
} from "./reservations-roles.handlers.js";
import type { ReservationCatalogAdapter } from "./reservation-catalog.adapter.js";

type Reservation = typeof reservationTable.$inferSelect;
type ReservationWithGuild = Reservation & {
  guild: typeof guildTable.$inferSelect;
};

export interface ReservationMutationPorts {
  readonly catalog: ReservationCatalogAdapter;
  readonly enqueueNotification: (
    notificationJobId: string,
    delayMs: number,
  ) => Effect.Effect<unknown, unknown>;
  readonly removeNotification: (
    notificationJobId: string,
  ) => Effect.Effect<unknown, unknown>;
  readonly publish: (
    routingKey:
      | "guilds.reservations.create"
      | "guilds.reservations.delete"
      | "guilds.reservations.v2.changed",
    payload: unknown,
  ) => Effect.Effect<unknown, unknown>;
}

type ReminderContext = {
  readonly target: {
    readonly id: number;
    readonly externalId: string;
    readonly targetType: "CHANNEL" | "DM";
    readonly active: boolean;
    readonly canSend: boolean;
  };
  readonly scheduledFor: Date;
};

const RULE_NAME = "__system:reservation-reminder__";
const RESERVATION_SOURCE_ENTITY_TYPE = "reservation";

const visibleGuildIds = (
  database: typeof ApiDatabase.Service,
  guildId: string,
) =>
  database
    .select()
    .from(reservationShareTable)
    .where(
      and(
        isNull(reservationShareTable.revokedAt),
        or(
          eq(reservationShareTable.firstGuildId, guildId),
          eq(reservationShareTable.secondGuildId, guildId),
        ),
      ),
    )
    .pipe(
      Effect.map((shares) => [
        guildId,
        ...shares.map((share) =>
          share.firstGuildId === guildId
            ? share.secondGuildId
            : share.firstGuildId,
        ),
      ]),
    );

const accessibleGuildIds = (
  database: typeof ApiDatabase.Service,
  discordId: string,
) =>
  database
    .selectDistinct({ id: guildTable.id })
    .from(guildTable)
    .leftJoin(
      memberTable,
      and(
        eq(memberTable.guildId, guildTable.id),
        eq(memberTable.userId, discordId),
        eq(memberTable.active, true),
        isNotNull(memberTable.globalUserId),
      ),
    )
    .leftJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
    .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
    .where(
      and(
        eq(guildTable.active, true),
        or(
          eq(guildTable.ownerId, discordId),
          arrayOverlaps(roleTable.permissions, [Permission.LOOTLOG_ACCESS]),
        ),
      ),
    )
    .pipe(Effect.map((guilds) => guilds.map(({ id }) => id)));

const findReservationWithGuild = (
  database: typeof ApiDatabase.Service,
  where: Exclude<ReturnType<typeof and>, undefined>,
) =>
  database
    .select({ reservation: reservationTable, guild: guildTable })
    .from(reservationTable)
    .innerJoin(guildTable, eq(guildTable.id, reservationTable.guildId))
    .where(where)
    .limit(1)
    .pipe(
      Effect.map((rows) => {
        const row = rows[0];
        return row ? { ...row.reservation, guild: row.guild } : null;
      }),
    );

const prepareReminder = (
  database: typeof ApiDatabase.Service,
  options: {
    readonly discordId: string;
    readonly startsAt: Date;
    readonly reminderMinutesBefore: number | null;
  },
): Effect.Effect<ReminderContext | null, unknown> =>
  Effect.gen(function* () {
    if (options.reminderMinutesBefore === null) return null;
    const scheduledFor = new Date(
      options.startsAt.getTime() - options.reminderMinutesBefore * 60_000,
    );
    if (scheduledFor.getTime() <= Date.now()) {
      return yield* Effect.fail(
        new UnprocessableEntityException({ code: "REMINDER_TIME_ELAPSED" }),
      );
    }
    const targets = yield* database
      .select()
      .from(notificationTargetTable)
      .where(
        and(
          eq(notificationTargetTable.ownerType, "USER"),
          eq(notificationTargetTable.ownerId, options.discordId),
          eq(notificationTargetTable.provider, "DISCORD"),
          eq(notificationTargetTable.targetType, "DM"),
          eq(notificationTargetTable.active, true),
          eq(notificationTargetTable.canSend, true),
        ),
      )
      .orderBy(desc(notificationTargetTable.updatedAt))
      .limit(1);
    const target = targets[0];
    if (!target) {
      return yield* Effect.fail(
        new UnprocessableEntityException({ code: "DM_TARGET_REQUIRED" }),
      );
    }
    return { target, scheduledFor };
  });

const getOrCreateReminderRule = (
  database: typeof ApiDatabase.Service,
  discordId: string,
) =>
  Effect.gen(function* () {
    const existing = yield* database
      .select()
      .from(notificationRuleTable)
      .where(
        and(
          eq(notificationRuleTable.ownerType, "USER"),
          eq(notificationRuleTable.ownerId, discordId),
          eq(notificationRuleTable.name, RULE_NAME),
        ),
      )
      .limit(1);
    if (existing[0]) return existing[0];
    return yield* database.transaction((transaction) =>
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
    );
  });

const cancelReminder = (
  database: typeof ApiDatabase.Service,
  ports: ReservationMutationPorts,
  reservationId: number,
) =>
  Effect.gen(function* () {
    const jobs = yield* database
      .select({ id: notificationJobTable.id })
      .from(notificationJobTable)
      .where(
        and(
          eq(
            notificationJobTable.sourceEntityType,
            RESERVATION_SOURCE_ENTITY_TYPE,
          ),
          eq(notificationJobTable.sourceEntityId, String(reservationId)),
          inArray(notificationJobTable.status, ["PENDING", "BLOCKED"]),
        ),
      );
    yield* Effect.forEach(jobs, ({ id }) => ports.removeNotification(id), {
      concurrency: "unbounded",
      discard: true,
    });
    if (jobs.length > 0) {
      yield* database
        .update(notificationJobTable)
        .set({
          status: "CANCELED",
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          inArray(
            notificationJobTable.id,
            jobs.map(({ id }) => id),
          ),
        );
    }
  });

const scheduleReminder = (
  database: typeof ApiDatabase.Service,
  ports: ReservationMutationPorts,
  options: {
    readonly context: ReminderContext | null;
    readonly discordId: string;
    readonly reservationId: number;
    readonly spotName: string;
    readonly organizationName: string;
    readonly startsAt: Date;
  },
) =>
  Effect.gen(function* () {
    if (!options.context) return;
    const rule = yield* getOrCreateReminderRule(database, options.discordId);
    if (!rule) {
      return yield* Effect.fail(
        new UnprocessableEntityException({ code: "DM_TARGET_REQUIRED" }),
      );
    }
    const startsAtDiscord = formatDiscordRelativeTimestamp(options.startsAt);
    const message = `Rezerwacja ${options.spotName} w ${options.organizationName} rozpoczyna się ${startsAtDiscord}.`;
    const idempotencyKey = [
      "scheduled",
      rule.id,
      options.context.target.id,
      RESERVATION_SOURCE_ENTITY_TYPE,
      options.reservationId,
      options.context.scheduledFor.toISOString(),
    ].join(":");
    const values = {
      id: randomUUID(),
      ruleId: rule.id,
      targetId: options.context.target.id,
      ownerType: rule.ownerType,
      ownerId: rule.ownerId,
      jobKind: NotificationJobKind.SCHEDULED,
      scheduledFor: options.context.scheduledFor,
      status: "PENDING" as const,
      idempotencyKey,
      sourceEntityType: RESERVATION_SOURCE_ENTITY_TYPE,
      sourceEntityId: String(options.reservationId),
      sourceEventId: null,
      payloadSnapshot: {
        title: "Nadchodząca rezerwacja",
        message,
        content: message,
        source: "reservation-reminder",
        reservationId: options.reservationId,
        spotName: options.spotName,
        organizationName: options.organizationName,
        startsAt: options.startsAt.toISOString(),
      },
      blockedReason: null,
      updatedAt: new Date(),
    };
    const inserted = yield* database
      .insert(notificationJobTable)
      .values(values)
      .onConflictDoNothing({ target: notificationJobTable.idempotencyKey })
      .returning();
    let job = inserted[0] ?? null;
    if (!job) {
      const existing = yield* database
        .select()
        .from(notificationJobTable)
        .where(eq(notificationJobTable.idempotencyKey, idempotencyKey))
        .limit(1);
      if (existing[0]?.status === "CANCELED") {
        job = yield* database.transaction((transaction) =>
          Effect.gen(function* () {
            yield* transaction
              .update(notificationJobTable)
              .set({
                idempotencyKey: `${idempotencyKey}:canceled:${randomUUID()}`,
              })
              .where(eq(notificationJobTable.id, existing[0].id));
            const created = yield* transaction
              .insert(notificationJobTable)
              .values(values)
              .returning();
            return created[0] ?? null;
          }),
        );
      }
    }
    if (!job) return;
    yield* ports
      .enqueueNotification(
        job.id,
        Math.max(0, options.context.scheduledFor.getTime() - Date.now()),
      )
      .pipe(
        Effect.catch((error) =>
          cancelReminder(database, ports, options.reservationId).pipe(
            Effect.andThen(Effect.fail(error)),
          ),
        ),
      );
  });

const publishEvent = (
  ports: ReservationMutationPorts,
  action: "created" | "updated" | "deleted",
  input: {
    readonly sourceGuildId: string;
    readonly audienceGuildIds: string[];
    readonly reservation: Reservation;
    readonly actorDiscordId: string;
  },
) => {
  const v2: ReservationChangedEventV2 = {
    version: 2,
    action,
    sourceGuildId: input.sourceGuildId,
    audienceGuildIds: input.audienceGuildIds,
    reservationId: input.reservation.id,
    spotId: input.reservation.spotId,
  };
  const legacy = {
    guildId: input.sourceGuildId,
    reservation: {
      id: input.reservation.id,
      reservationId: input.reservation.spotId,
      createdDate: input.reservation.createdAt.toISOString(),
      fromDate: input.reservation.startsAt.toISOString(),
      toDate: input.reservation.endsAt.toISOString(),
      createdBy: input.actorDiscordId,
    },
  };
  const publications = [
    ports.publish("guilds.reservations.v2.changed", v2),
    ...(action === "updated"
      ? []
      : [
          ports.publish(
            action === "created"
              ? "guilds.reservations.create"
              : "guilds.reservations.delete",
            legacy,
          ),
        ]),
  ];
  return Effect.all(publications, {
    concurrency: "unbounded",
    discard: true,
  }).pipe(Effect.ignore);
};

export const makeReservationMutationsDataLayer = (
  ports: ReservationMutationPorts,
) =>
  Layer.effect(
    ReservationsRolesData,
    Effect.map(ApiDatabase, (database) => {
      const operation = <A, E>(
        operationId: string,
        effect: Effect.Effect<A, E>,
      ) =>
        effect.pipe(
          Effect.withSpan(operationId, {
            attributes: { adapter: "drizzle", retryCount: 0 },
          }),
          Effect.mapError(
            (cause) => new ReservationsRolesOperationError({ cause }),
          ),
        );

      const findGuild = (guildId: string) =>
        database
          .select()
          .from(guildTable)
          .where(eq(guildTable.id, guildId))
          .limit(1)
          .pipe(Effect.map((rows) => rows[0] ?? null));

      const findVisible = (reservationId: number, guildIds: string[]) =>
        database
          .select()
          .from(reservationTable)
          .where(
            and(
              eq(reservationTable.id, reservationId),
              inArray(reservationTable.guildId, guildIds),
            ),
          )
          .limit(1)
          .pipe(Effect.map((rows) => rows[0] ?? null));

      const findOwned = (options: {
        readonly reservationId: number;
        readonly guildIds: string[];
        readonly userId: string;
        readonly discordId: string;
      }) =>
        options.guildIds.length === 0
          ? Effect.succeed(null)
          : findReservationWithGuild(
              database,
              and(
                eq(reservationTable.id, options.reservationId),
                inArray(reservationTable.guildId, options.guildIds),
                or(
                  eq(reservationTable.createdByUserId, options.userId),
                  eq(
                    reservationTable.legacyCreatedByDiscordId,
                    options.discordId,
                  ),
                ),
              ),
            );

      const restoreReservation = (reservation: Reservation) =>
        database
          .update(reservationTable)
          .set({
            startsAt: reservation.startsAt,
            endsAt: reservation.endsAt,
            comment: reservation.comment,
            reminderMinutesBefore: reservation.reminderMinutesBefore,
            updatedAt: new Date(),
          })
          .where(eq(reservationTable.id, reservation.id));

      const schedule = (options: Parameters<typeof scheduleReminder>[2]) =>
        scheduleReminder(database, ports, options);

      const preparePreviousReminder = (options: {
        readonly reservation: Reservation;
        readonly discordId: string;
        readonly reminderNeedsReschedule: boolean;
      }) => {
        const { reservation } = options;
        if (
          !options.reminderNeedsReschedule ||
          reservation.reminderMinutesBefore === null
        ) {
          return Effect.succeed(null);
        }
        const scheduledFor = new Date(
          reservation.startsAt.getTime() -
            reservation.reminderMinutesBefore * 60_000,
        );
        if (scheduledFor.getTime() <= Date.now()) return Effect.succeed(null);
        return prepareReminder(database, {
          discordId: options.discordId,
          startsAt: reservation.startsAt,
          reminderMinutesBefore: reservation.reminderMinutesBefore,
        }).pipe(Effect.catch(() => Effect.succeed(null)));
      };

      const restoreReservationAndReminder = (options: {
        readonly reservation: ReservationWithGuild;
        readonly discordId: string;
        readonly previousReminderContext: ReminderContext | null;
      }) =>
        restoreReservation(options.reservation).pipe(
          Effect.andThen(
            cancelReminder(database, ports, options.reservation.id),
          ),
          Effect.andThen(
            schedule({
              context: options.previousReminderContext,
              discordId: options.discordId,
              reservationId: options.reservation.id,
              spotName: options.reservation.spotName,
              organizationName: options.reservation.guild.name,
              startsAt: options.reservation.startsAt,
            }),
          ),
        );

      const deletePersisted = (options: {
        readonly reservation: Reservation;
        readonly audienceGuildIds: string[];
        readonly actorDiscordId: string;
      }) =>
        cancelReminder(database, ports, options.reservation.id).pipe(
          Effect.andThen(
            database
              .delete(reservationTable)
              .where(eq(reservationTable.id, options.reservation.id)),
          ),
          Effect.andThen(
            publishEvent(ports, "deleted", {
              sourceGuildId: options.reservation.guildId,
              audienceGuildIds: options.audienceGuildIds,
              reservation: options.reservation,
              actorDiscordId: options.actorDiscordId,
            }),
          ),
          Effect.asVoid,
        );

      const create = (
        context: ReservationViewerContext,
        spotId: string,
        data: CreateReservationDto,
      ) =>
        Effect.gen(function* () {
          const [spot, guild, audienceGuildIds, member] = yield* Effect.all([
            ports.catalog.getSpot(spotId),
            findGuild(context.guildId),
            visibleGuildIds(database, context.guildId),
            database
              .select()
              .from(memberTable)
              .where(
                and(
                  eq(memberTable.guildId, context.guildId),
                  eq(memberTable.active, true),
                  or(
                    eq(memberTable.globalUserId, context.userId),
                    eq(memberTable.userId, context.discordId),
                  ),
                ),
              )
              .orderBy(desc(memberTable.updatedAt))
              .limit(1)
              .pipe(Effect.map((rows) => rows[0] ?? null)),
          ]);
          if (!member || !guild) {
            return yield* Effect.fail(
              new ForbiddenException({ code: "RESERVATION_MEMBER_REQUIRED" }),
            );
          }
          const settings = resolveReservationSettings(guild);
          const range = {
            startsAt: new Date(data.startsAt),
            endsAt: new Date(data.endsAt),
          };
          yield* Effect.try(() =>
            validateReservationTime({ ...range, settings }),
          );
          const reminderMinutesBefore = data.reminderMinutesBefore ?? null;
          const reminderContext = yield* prepareReminder(database, {
            discordId: context.discordId,
            startsAt: range.startsAt,
            reminderMinutesBefore,
          });
          const createResult = yield* database.transaction((transaction) =>
            Effect.gen(function* () {
              yield* transaction.execute(
                sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`,
              );
              const overlap = yield* transaction
                .select({ id: reservationTable.id })
                .from(reservationTable)
                .where(
                  and(
                    eq(reservationTable.guildId, context.guildId),
                    eq(reservationTable.spotId, spot.id),
                    lt(reservationTable.startsAt, range.endsAt),
                    gt(reservationTable.endsAt, range.startsAt),
                  ),
                )
                .limit(1);
              if (overlap.length > 0) return { kind: "overlap" } as const;
              const active = yield* transaction
                .select({ count: count() })
                .from(reservationTable)
                .where(
                  and(
                    eq(reservationTable.guildId, context.guildId),
                    eq(reservationTable.spotId, spot.id),
                    gt(reservationTable.endsAt, new Date()),
                    or(
                      eq(reservationTable.createdByUserId, context.userId),
                      eq(
                        reservationTable.legacyCreatedByDiscordId,
                        context.discordId,
                      ),
                    ),
                  ),
                );
              if (
                (active[0]?.count ?? 0) >=
                settings.reservationActiveLimitPerSpot
              ) {
                return { kind: "active-limit" } as const;
              }
              const rows = yield* transaction
                .insert(reservationTable)
                .values({
                  guildId: context.guildId,
                  spotId: spot.id,
                  spotName: spot.name,
                  startsAt: range.startsAt,
                  endsAt: range.endsAt,
                  createdByUserId: context.userId,
                  authorDisplayName: member.name,
                  authorAvatarUrl: getDiscordAvatarUrl(
                    context.discordId,
                    member.avatar,
                  ),
                  reminderMinutesBefore,
                  comment: data.comment || null,
                  updatedAt: new Date(),
                })
                .returning();
              return rows[0]
                ? ({ kind: "created", reservation: rows[0] } as const)
                : ({ kind: "insert-failed" } as const);
            }),
          );
          if (createResult.kind === "overlap") {
            return yield* Effect.fail(
              new ConflictException({ code: "RESERVATION_OVERLAP" }),
            );
          }
          if (createResult.kind === "active-limit") {
            return yield* Effect.fail(
              new UnprocessableEntityException({
                code: "ACTIVE_LIMIT_REACHED",
                limit: settings.reservationActiveLimitPerSpot,
              }),
            );
          }
          if (createResult.kind === "insert-failed") {
            return yield* Effect.die("Reservation insert returned no row");
          }
          const created = { ...createResult.reservation, guild };
          yield* schedule({
            context: reminderContext,
            discordId: context.discordId,
            reservationId: created.id,
            spotName: spot.name,
            organizationName: guild.name,
            startsAt: range.startsAt,
          }).pipe(
            Effect.catch((error) =>
              database
                .delete(reservationTable)
                .where(eq(reservationTable.id, created.id))
                .pipe(Effect.andThen(Effect.fail(error))),
            ),
          );
          yield* publishEvent(ports, "created", {
            sourceGuildId: context.guildId,
            audienceGuildIds,
            reservation: created,
            actorDiscordId: context.discordId,
          });
          return presentReservation(created, {
            guildId: context.guildId,
            userId: context.userId,
            discordId: context.discordId,
            canModerateCurrentGuild: canModerateReservations(context),
          });
        });

      const updateOwned = (options: {
        readonly userId: string;
        readonly discordId: string;
        readonly reservationId: number;
        readonly data: UpdateReservationDto;
      }) =>
        Effect.gen(function* () {
          const guildIds = yield* accessibleGuildIds(
            database,
            options.discordId,
          );
          const reservation = yield* findOwned({ ...options, guildIds });
          if (!reservation) {
            return yield* Effect.fail(
              new NotFoundException({ code: "RESERVATION_NOT_FOUND" }),
            );
          }
          const range = {
            startsAt: options.data.startsAt
              ? new Date(options.data.startsAt)
              : reservation.startsAt,
            endsAt: options.data.endsAt
              ? new Date(options.data.endsAt)
              : reservation.endsAt,
          };
          const comment =
            options.data.comment === undefined
              ? reservation.comment
              : options.data.comment || null;
          const reminderMinutesBefore =
            options.data.reminderMinutesBefore === undefined
              ? reservation.reminderMinutesBefore
              : options.data.reminderMinutesBefore;
          const timeChanged =
            range.startsAt.getTime() !== reservation.startsAt.getTime() ||
            range.endsAt.getTime() !== reservation.endsAt.getTime();
          const reminderNeedsReschedule =
            timeChanged ||
            reminderMinutesBefore !== reservation.reminderMinutesBefore;
          const audienceGuildIds = yield* visibleGuildIds(
            database,
            reservation.guildId,
          );
          if (timeChanged) {
            yield* Effect.try(() =>
              validateReservationTime({
                ...range,
                settings: resolveReservationSettings(reservation.guild),
                allowPastStart:
                  range.startsAt.getTime() === reservation.startsAt.getTime(),
              }),
            );
          }
          const reminderContext = reminderNeedsReschedule
            ? yield* prepareReminder(database, {
                discordId: options.discordId,
                startsAt: range.startsAt,
                reminderMinutesBefore,
              })
            : null;
          const previousReminderContext = yield* preparePreviousReminder({
            reservation,
            discordId: options.discordId,
            reminderNeedsReschedule,
          });
          const updateResult = yield* database.transaction((transaction) =>
            Effect.gen(function* () {
              yield* transaction.execute(
                sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`,
              );
              if (timeChanged) {
                const overlap = yield* transaction
                  .select({ id: reservationTable.id })
                  .from(reservationTable)
                  .where(
                    and(
                      ne(reservationTable.id, reservation.id),
                      eq(reservationTable.guildId, reservation.guildId),
                      eq(reservationTable.spotId, reservation.spotId),
                      lt(reservationTable.startsAt, range.endsAt),
                      gt(reservationTable.endsAt, range.startsAt),
                    ),
                  )
                  .limit(1);
                if (overlap.length > 0) return null;
              }
              const rows = yield* transaction
                .update(reservationTable)
                .set({
                  ...range,
                  comment,
                  reminderMinutesBefore,
                  updatedAt: new Date(),
                })
                .where(eq(reservationTable.id, reservation.id))
                .returning();
              return rows[0] ?? reservation;
            }),
          );
          if (!updateResult) {
            return yield* Effect.fail(
              new ConflictException({ code: "RESERVATION_OVERLAP" }),
            );
          }
          const updated = { ...updateResult, guild: reservation.guild };
          if (reminderNeedsReschedule) {
            yield* cancelReminder(database, ports, updated.id).pipe(
              Effect.andThen(
                schedule({
                  context: reminderContext,
                  discordId: options.discordId,
                  reservationId: updated.id,
                  spotName: updated.spotName,
                  organizationName: updated.guild.name,
                  startsAt: updated.startsAt,
                }),
              ),
              Effect.catch((error) =>
                restoreReservationAndReminder({
                  reservation,
                  discordId: options.discordId,
                  previousReminderContext,
                }).pipe(Effect.andThen(Effect.fail(error))),
              ),
            );
          }
          yield* publishEvent(ports, "updated", {
            sourceGuildId: updated.guildId,
            audienceGuildIds,
            reservation: updated,
            actorDiscordId:
              reservation.legacyCreatedByDiscordId ?? options.discordId,
          });
          return presentReservation(updated, {
            guildId: null,
            userId: options.userId,
            discordId: options.discordId,
            canModerateCurrentGuild: false,
          });
        });

      return ReservationsRolesData.of({
        create: (context, spotId, payload) =>
          operation(
            "createReservation",
            create(
              context,
              spotId,
              structuredClone(payload) as CreateReservationDto,
            ),
          ),
        updateOwned: ({ userId, discordId }, reservationId, payload) =>
          operation(
            "updateMyReservation",
            updateOwned({
              userId,
              discordId,
              reservationId,
              data: structuredClone(payload) as UpdateReservationDto,
            }),
          ),
        deleteVisible: (context, reservationId) =>
          operation(
            "deleteReservation",
            Effect.gen(function* () {
              const visible = yield* visibleGuildIds(database, context.guildId);
              const reservation = yield* findVisible(reservationId, visible);
              if (!reservation) {
                return yield* Effect.fail(
                  new NotFoundException({ code: "RESERVATION_NOT_FOUND" }),
                );
              }
              const isOwned =
                reservation.createdByUserId === context.userId ||
                reservation.legacyCreatedByDiscordId === context.discordId;
              const canModerateSource =
                reservation.guildId === context.guildId &&
                canModerateReservations(context);
              if (!isOwned && !canModerateSource) {
                return yield* Effect.fail(
                  new ForbiddenException({
                    code: "RESERVATION_DELETE_FORBIDDEN",
                  }),
                );
              }
              const audienceGuildIds =
                reservation.guildId === context.guildId
                  ? visible
                  : yield* visibleGuildIds(database, reservation.guildId);
              yield* deletePersisted({
                reservation,
                audienceGuildIds,
                actorDiscordId:
                  reservation.legacyCreatedByDiscordId ?? context.discordId,
              });
            }),
          ),
        deleteOwned: ({ userId, discordId }, reservationId) =>
          operation(
            "deleteMyReservation",
            Effect.gen(function* () {
              const guildIds = yield* accessibleGuildIds(database, discordId);
              const reservation = yield* findOwned({
                reservationId,
                guildIds,
                userId,
                discordId,
              });
              if (!reservation) {
                return yield* Effect.fail(
                  new NotFoundException({ code: "RESERVATION_NOT_FOUND" }),
                );
              }
              yield* deletePersisted({
                reservation,
                audienceGuildIds: yield* visibleGuildIds(
                  database,
                  reservation.guildId,
                ),
                actorDiscordId:
                  reservation.legacyCreatedByDiscordId ?? discordId,
              });
            }),
          ),
      });
    }),
  );
