import { and, count, desc, eq, gt, lt, or } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { resolveReservationSettings } from "@lootlog/domain/reservations";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import { reservationTable } from "#src/database/drizzle/reservation.schema";
import {
  ResourceConflictError,
  PermissionDeniedError,
  InvalidEntityError,
} from "@lootlog/protocol/http/errors";
import type { CreateReservationRequest } from "#src/contracts/reservations/schemas";
import { visibleReservationGuildIds } from "./reservation-visibility-query.js";
import {
  getDiscordAvatarUrl,
  presentReservation,
} from "./reservation-presentation.js";
import { validateReservationTime } from "./reservation-policy.js";
import {
  canModerateReservations,
  type ReservationViewerContext,
} from "./reservation-viewer.js";
import {
  prepareReminder,
  scheduleReminder,
} from "./reservation-reminders.data-layer.js";
import {
  publishReservationChange,
  type ReservationMutationPorts,
} from "./reservation-mutation-ports.js";

const findGuild = (database: typeof ApiDatabase.Service, guildId: string) =>
  database
    .select()
    .from(guildTable)
    .where(eq(guildTable.id, guildId))
    .limit(1)
    .pipe(Effect.map((rows) => rows[0] ?? null));

export const createReservation = (
  database: typeof ApiDatabase.Service,
  ports: ReservationMutationPorts,
  context: ReservationViewerContext,
  spotId: string,
  data: CreateReservationRequest,
) =>
  Effect.gen(function* () {
    const [spot, guild, audienceGuildIds, member] = yield* Effect.all(
      [
        ports.catalog.getSpot(spotId),
        findGuild(database, context.guildId),
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
      return yield* new PermissionDeniedError({
        code: "RESERVATION_MEMBER_REQUIRED",
      });
    }

    const settings = resolveReservationSettings(guild);

    const range = {
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
    };

    yield* validateReservationTime({ ...range, settings });
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

        if ((active[0]?.count ?? 0) >= settings.reservationActiveLimitPerSpot) {
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
      return yield* new ResourceConflictError({
        code: "RESERVATION_OVERLAP",
      });
    }

    if (createResult.kind === "active-limit") {
      return yield* new InvalidEntityError({
        code: "ACTIVE_LIMIT_REACHED",
        details: { limit: settings.reservationActiveLimitPerSpot },
      });
    }

    if (createResult.kind === "insert-failed") {
      return yield* Effect.die("Reservation insert returned no row");
    }

    const created = { ...createResult.reservation, guild };
    yield* scheduleReminder(database, ports, {
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
    yield* publishReservationChange(ports, "created", {
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
