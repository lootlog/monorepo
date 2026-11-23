import { withAdapterSpan } from "@lootlog/instrumentation/operation";
import { visibleReservationGuildIds } from "./reservation-visibility-query.js";
import { apiKeyOrganizationFilter } from "#src/runtime/auth/organization-scope";
import { and, eq, inArray } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { reservationTable } from "#src/database/drizzle/reservation.schema";
import {
  PermissionDeniedError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import { canModerateReservations } from "./reservation-viewer.js";
import { OrganizationWorkspaceOperationError } from "#src/guilds/organization-workspace-access";
import { OrganizationWorkspaceData } from "./reservations-data.js";
import { cancelReminder } from "./reservation-reminders.data-layer.js";
import {
  findOwnedReservation,
  writableReservationGuildIds,
  type Reservation,
} from "./reservation-ownership-query.js";
import {
  publishReservationChange,
  type ReservationMutationPorts,
} from "./reservation-mutation-ports.js";
import { createReservation } from "./reservation-create.data-layer.js";
import { updateOwnedReservation } from "./reservation-update.data-layer.js";

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
          withAdapterSpan(operationId, "drizzle"),
          Effect.mapError(
            (cause) => new OrganizationWorkspaceOperationError({ cause }),
          ),
        );

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
            publishReservationChange(ports, "deleted", {
              sourceGuildId: options.reservation.guildId,
              audienceGuildIds: options.audienceGuildIds,
              reservation: options.reservation,
              actorDiscordId: options.actorDiscordId,
            }),
          ),
          Effect.asVoid,
        );

      return OrganizationWorkspaceData.of({
        create: (context, spotId, payload) =>
          operation(
            "createReservation",
            createReservation(
              database,
              ports,
              context,
              spotId,
              structuredClone(payload),
            ),
          ),
        updateOwned: ({ userId, discordId }, reservationId, payload) =>
          operation(
            "updateMyReservation",
            updateOwnedReservation(database, ports, {
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
                return yield* new ResourceNotFoundError({
                  code: "RESERVATION_NOT_FOUND",
                });
              }

              const isOwned =
                reservation.createdByUserId === context.userId ||
                reservation.legacyCreatedByDiscordId === context.discordId;

              const canModerateSource =
                reservation.guildId === context.guildId &&
                canModerateReservations(context);

              if (!isOwned && !canModerateSource) {
                return yield* new PermissionDeniedError({
                  code: "RESERVATION_DELETE_FORBIDDEN",
                });
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

              const reservation = yield* findOwnedReservation(database, {
                reservationId,
                guildIds,
                userId,
                discordId,
              });

              if (!reservation) {
                return yield* new ResourceNotFoundError({
                  code: "RESERVATION_NOT_FOUND",
                });
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
