import { and, eq, gt, lt, ne } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { resolveReservationSettings } from "@lootlog/domain/reservations";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { reservationTable } from "#src/database/drizzle/reservation.schema";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import type { UpdateReservationRequest } from "#src/contracts/reservations/schemas";
import { visibleReservationGuildIds } from "./reservation-visibility-query.js";
import { presentReservation } from "./reservation-presentation.js";
import { validateReservationTime } from "./reservation-policy.js";
import {
  cancelReminder,
  prepareReminder,
  scheduleReminder,
  type ReminderContext,
} from "./reservation-reminders.data-layer.js";
import {
  findOwnedReservation,
  writableReservationGuildIds,
  type Reservation,
  type ReservationWithGuild,
} from "./reservation-ownership-query.js";
import {
  publishReservationChange,
  type ReservationMutationPorts,
} from "./reservation-mutation-ports.js";

const restoreReservation = (
  database: typeof ApiDatabase.Service,
  reservation: Reservation,
) =>
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

const preparePreviousReminder = (
  database: typeof ApiDatabase.Service,
  options: {
    readonly reservation: Reservation;
    readonly discordId: string;
    readonly reminderNeedsReschedule: boolean;
  },
) => {
  const { reservation } = options;

  if (
    !options.reminderNeedsReschedule ||
    reservation.reminderMinutesBefore === null
  ) {
    return Effect.succeed(null);
  }

  const scheduledFor = new Date(
    reservation.startsAt.getTime() - reservation.reminderMinutesBefore * 60_000,
  );

  if (scheduledFor.getTime() <= Date.now()) return Effect.succeed(null);

  return prepareReminder(database, {
    discordId: options.discordId,
    startsAt: reservation.startsAt,
    reminderMinutesBefore: reservation.reminderMinutesBefore,
  }).pipe(Effect.orElseSucceed(() => null));
};

const restoreReservationAndReminder = (
  database: typeof ApiDatabase.Service,
  ports: ReservationMutationPorts,
  options: {
    readonly reservation: ReservationWithGuild;
    readonly discordId: string;
    readonly previousReminderContext: ReminderContext | null;
  },
) =>
  restoreReservation(database, options.reservation).pipe(
    Effect.andThen(cancelReminder(database, ports, options.reservation.id)),
    Effect.andThen(
      scheduleReminder(database, ports, {
        context: options.previousReminderContext,
        discordId: options.discordId,
        reservationId: options.reservation.id,
        spotName: options.reservation.spotName,
        organizationName: options.reservation.guild.name,
        startsAt: options.reservation.startsAt,
      }),
    ),
  );

export const updateOwnedReservation = (
  database: typeof ApiDatabase.Service,
  ports: ReservationMutationPorts,
  options: {
    readonly userId: string;
    readonly discordId: string;
    readonly reservationId: number;
    readonly data: UpdateReservationRequest;
  },
) =>
  Effect.gen(function* () {
    const guildIds = yield* writableReservationGuildIds(
      database,
      options.discordId,
    );

    const reservation = yield* findOwnedReservation(database, {
      ...options,
      guildIds,
    });

    if (!reservation) {
      return yield* new ResourceNotFoundError({
        code: "RESERVATION_NOT_FOUND",
      });
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
      yield* validateReservationTime({
        ...range,
        settings: resolveReservationSettings(reservation.guild),
        allowPastStart:
          range.startsAt.getTime() === reservation.startsAt.getTime(),
      });
    }

    const reminderContext = reminderNeedsReschedule
      ? yield* prepareReminder(database, {
          discordId: options.discordId,
          startsAt: range.startsAt,
          reminderMinutesBefore,
        })
      : null;

    const previousReminderContext = yield* preparePreviousReminder(database, {
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
      return yield* new ResourceConflictError({
        code: "RESERVATION_OVERLAP",
      });
    }

    const updated = { ...updateResult, guild: reservation.guild };

    if (reminderNeedsReschedule) {
      yield* cancelReminder(database, ports, updated.id).pipe(
        Effect.andThen(
          scheduleReminder(database, ports, {
            context: reminderContext,
            discordId: options.discordId,
            reservationId: updated.id,
            spotName: updated.spotName,
            organizationName: updated.guild.name,
            startsAt: updated.startsAt,
          }),
        ),
        Effect.tapError(() =>
          restoreReservationAndReminder(database, ports, {
            reservation,
            discordId: options.discordId,
            previousReminderContext,
          }),
        ),
      );
    }

    yield* publishReservationChange(ports, "updated", {
      sourceGuildId: updated.guildId,
      audienceGuildIds,
      reservation: updated,
      actorDiscordId: reservation.legacyCreatedByDiscordId ?? options.discordId,
    });

    return presentReservation(updated, {
      guildId: null,
      userId: options.userId,
      discordId: options.discordId,
      canModerateCurrentGuild: false,
    });
  });
