import type { CanonicalRabbitEvent } from "@lootlog/protocol/rabbit/events";
import { visibleReservationGuildIds } from "#src/reservations/reservation-visibility-query";
import { apiKeyOrganizationFilter } from "#src/runtime/auth/organization-scope";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import { Permission } from "@lootlog/schema/permissions";
import { and, count, desc, eq, gt, inArray, lt, ne, or } from "drizzle-orm";
import { Clock, Effect, Layer } from "effect";
import { resolveReservationSettings } from "@lootlog/domain/reservations";

import type { ReservationChangedEventV2 } from "@lootlog/schema/reservation-events";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import { reservationTable } from "#src/database/drizzle/reservation.schema";
import {
  ResourceConflictError,
  PermissionDeniedError,
  ResourceNotFoundError,
  InvalidEntityError,
} from "#src/shared/http/http-errors";
import type {
  CreateReservationRequest,
  UpdateReservationRequest,
} from "#src/contracts/reservations/schemas";
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
  OrganizationWorkspaceData,
  OrganizationWorkspaceOperationError,
} from "./organization-workspace.operations.js";
import type { ReservationCatalogAdapter } from "./reservation-catalog.adapter.js";
import {
  cancelReminder,
  prepareReminder,
  scheduleReminder,
  type ReminderContext,
  type ReservationReminderPorts,
} from "./reservation-reminders.data-layer.js";

type Reservation = typeof reservationTable.$inferSelect;

type ReservationWithGuild = Reservation & {
  guild: typeof guildTable.$inferSelect;
};

export interface ReservationMutationPorts extends ReservationReminderPorts {
  readonly catalog: ReservationCatalogAdapter;
  readonly publish: <
    Key extends
      | "guilds.reservations.create"
      | "guilds.reservations.delete"
      | "guilds.reservations.v2.changed",
  >(
    routingKey: Key,
    payload: CanonicalRabbitEvent<Key>,
  ) => Effect.Effect<unknown, unknown>;
}

const guildIdsGranting = (
  database: typeof ApiDatabase.Service,
  discordId: string,
  permission: Permission,
) =>
  selectAccessibleGuilds(database, discordId, [permission]).pipe(
    Effect.map((rows) => rows.map(({ guild }) => guild.id)),
  );

/**
 * Organizations where the caller may change their own reservations: the same
 * read and write requirement as the Organization reservation endpoints.
 */
const writableReservationGuildIds = (
  database: typeof ApiDatabase.Service,
  discordId: string,
) =>
  Effect.map(
    Effect.all(
      [
        guildIdsGranting(
          database,
          discordId,
          Permission.LOOTLOG_RESERVATIONS_READ,
        ),
        guildIdsGranting(
          database,
          discordId,
          Permission.LOOTLOG_RESERVATIONS_WRITE,
        ),
      ],
      { concurrency: 2 },
    ),
    ([readable, writable]) => {
      const writableIds = new Set(writable);

      return readable.filter((guildId) => writableIds.has(guildId));
    },
  );

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
    OrganizationWorkspaceData,
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
            (cause) => new OrganizationWorkspaceOperationError({ cause }),
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
        Effect.gen(function* () {
          const keyScope = yield* apiKeyOrganizationFilter(
            reservationTable.guildId,
          );

          return yield* database
            .select()
            .from(reservationTable)
            .where(
              and(
                keyScope,
                eq(reservationTable.id, reservationId),
                inArray(reservationTable.guildId, guildIds),
              ),
            )
            .limit(1)
            .pipe(Effect.map((rows) => rows[0] ?? null));
        });

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
        }).pipe(Effect.orElseSucceed(() => null));
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
        data: CreateReservationRequest,
      ) =>
        Effect.gen(function* () {
          const [spot, guild, audienceGuildIds, member] = yield* Effect.all(
            [
              ports.catalog.getSpot(spotId),
              findGuild(context.guildId),
              visibleReservationGuildIds(database, context.guildId),
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
            ],
            { concurrency: "unbounded" },
          );

          if (!member || !guild) {
            return yield* Effect.fail(
              new PermissionDeniedError({
                code: "RESERVATION_MEMBER_REQUIRED",
              }),
            );
          }

          const settings = resolveReservationSettings(guild);

          const range = {
            startsAt: new Date(data.startsAt),
            endsAt: new Date(data.endsAt),
          };

          yield* Effect.try({
            try: () => validateReservationTime({ ...range, settings }),
            catch: (cause) => cause,
          });
          const reminderMinutesBefore = data.reminderMinutesBefore ?? null;

          const reminderContext = yield* prepareReminder(database, {
            discordId: context.discordId,
            startsAt: range.startsAt,
            reminderMinutesBefore,
          });

          const createResult = yield* database.transaction((transaction) =>
            Effect.gen(function* () {
              yield* transaction.setTransaction({
                isolationLevel: "serializable",
              });

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
                    gt(
                      reservationTable.endsAt,
                      new Date(yield* Clock.currentTimeMillis),
                    ),
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
                  updatedAt: new Date(yield* Clock.currentTimeMillis),
                })
                .returning();

              return rows[0]
                ? ({ kind: "created", reservation: rows[0] } as const)
                : ({ kind: "insert-failed" } as const);
            }),
          );

          if (createResult.kind === "overlap") {
            return yield* Effect.fail(
              new ResourceConflictError({ code: "RESERVATION_OVERLAP" }),
            );
          }

          if (createResult.kind === "active-limit") {
            return yield* Effect.fail(
              new InvalidEntityError({
                code: "ACTIVE_LIMIT_REACHED",
                details: { limit: settings.reservationActiveLimitPerSpot },
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
        readonly data: UpdateReservationRequest;
      }) =>
        Effect.gen(function* () {
          const guildIds = yield* writableReservationGuildIds(
            database,
            options.discordId,
          );

          const reservation = yield* findOwned({ ...options, guildIds });

          if (!reservation) {
            return yield* Effect.fail(
              new ResourceNotFoundError({ code: "RESERVATION_NOT_FOUND" }),
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

          const audienceGuildIds = yield* visibleReservationGuildIds(
            database,
            reservation.guildId,
          );

          if (timeChanged) {
            yield* Effect.try({
              try: () =>
                validateReservationTime({
                  ...range,
                  settings: resolveReservationSettings(reservation.guild),
                  allowPastStart:
                    range.startsAt.getTime() === reservation.startsAt.getTime(),
                }),
              catch: (cause) => cause,
            });
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
              yield* transaction.setTransaction({
                isolationLevel: "serializable",
              });

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
                  updatedAt: new Date(yield* Clock.currentTimeMillis),
                })
                .where(eq(reservationTable.id, reservation.id))
                .returning();

              return rows[0] ?? reservation;
            }),
          );

          if (!updateResult) {
            return yield* Effect.fail(
              new ResourceConflictError({ code: "RESERVATION_OVERLAP" }),
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
              Effect.tapError(() =>
                restoreReservationAndReminder({
                  reservation,
                  discordId: options.discordId,
                  previousReminderContext,
                }),
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

      return OrganizationWorkspaceData.of({
        create: (context, spotId, payload) =>
          operation(
            "createReservation",
            create(context, spotId, structuredClone(payload)),
          ),
        updateOwned: ({ userId, discordId }, reservationId, payload) =>
          operation(
            "updateMyReservation",
            updateOwned({
              userId,
              discordId,
              reservationId,
              data: structuredClone(payload),
            }),
          ),
        deleteVisible: (context, reservationId) =>
          operation(
            "deleteReservation",
            Effect.gen(function* () {
              const visible = yield* visibleReservationGuildIds(
                database,
                context.guildId,
              );

              const reservation = yield* findVisible(reservationId, visible);

              if (!reservation) {
                return yield* Effect.fail(
                  new ResourceNotFoundError({ code: "RESERVATION_NOT_FOUND" }),
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
                  new PermissionDeniedError({
                    code: "RESERVATION_DELETE_FORBIDDEN",
                  }),
                );
              }

              const audienceGuildIds =
                reservation.guildId === context.guildId
                  ? visible
                  : yield* visibleReservationGuildIds(
                      database,
                      reservation.guildId,
                    );

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
              const guildIds = yield* writableReservationGuildIds(
                database,
                discordId,
              );

              const reservation = yield* findOwned({
                reservationId,
                guildIds,
                userId,
                discordId,
              });

              if (!reservation) {
                return yield* Effect.fail(
                  new ResourceNotFoundError({ code: "RESERVATION_NOT_FOUND" }),
                );
              }

              yield* deletePersisted({
                reservation,
                audienceGuildIds: yield* visibleReservationGuildIds(
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
