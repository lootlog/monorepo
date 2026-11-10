import { readyRoomSourceVisibility } from "./ready-room-visibility.js";
import { requestApiKeyAccess } from "#src/runtime/auth/forward-auth-identity";

import { Effect } from "effect";

import {
  createPartyGatheringSummary,
  createReadyRoomProjection,
} from "#src/messaging/ready-room/ready-room-projection";
import { PermissionDeniedError } from "#src/shared/http/http-errors";
import type { ReadyRoomIdentity } from "./party-ready-room.handlers.js";
import type { ReadyRoomContext } from "./ready-room.data-layer.js";

export const activeRooms = (
  context: ReadyRoomContext,
  identity: ReadyRoomIdentity,
  guildIds: ReadonlyArray<string>,
  world: string,
) =>
  Effect.gen(function* () {
    const rooms = yield* context.repository.findActive(guildIds, world);

    if (rooms.length === 0) return [];

    const visibleGuilds = yield* readyRoomSourceVisibility(
      context.database,
      identity.discordId,
      guildIds,
    );

    return rooms
      .flatMap((room) => {
        const visible = visibleGuilds(room);

        if (visible.length === 0) return [];

        return [createPartyGatheringSummary(room, visible)];
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

export const listRooms = (
  context: ReadyRoomContext,
  identity: ReadyRoomIdentity,
) =>
  Effect.gen(function* () {
    const apiKey = yield* requestApiKeyAccess;

    const aggregates = yield* context.repository.findForUser(
      identity.discordId,
    );

    // Most players are in no room, so the guild lookup waits for one.
    if (aggregates.length === 0) return [];

    const guildIds = yield* context.accessibleGuildIds(identity.discordId);

    const visibleSources = yield* readyRoomSourceVisibility(
      context.database,
      identity.discordId,
      guildIds,
    );

    return [
      ...new Map(
        aggregates.map((item) => [item.notificationId, item]),
      ).values(),
    ].flatMap((aggregate) => {
      const live =
        aggregate.status === "ACTIVE" &&
        Date.parse(aggregate.expiresAt) > context.clock();

      const sharesGuild = guildIds.some((id) =>
        aggregate.guildIds.includes(id),
      );

      if (!live || !sharesGuild) return [];

      if (aggregate.npc && visibleSources(aggregate).length === 0) return [];

      if (apiKey && !aggregate.guildIds.every((id) => guildIds.includes(id)))
        return [];

      const projection = createReadyRoomProjection(
        aggregate,
        identity.discordId,
        aggregate.npc ? visibleSources(aggregate) : guildIds,
      );

      return projection ? [projection] : [];
    });
  });

export const getRoom = (
  context: ReadyRoomContext,
  identity: ReadyRoomIdentity,
  notificationId: string,
  guildIds: ReadonlyArray<string>,
) =>
  // The caller's own source visibility does not depend on the room, so it is
  // read beside it.
  Effect.all(
    [
      context.getLive(notificationId),
      readyRoomSourceVisibility(context.database, identity.discordId, guildIds),
    ],
    { concurrency: "unbounded" },
  ).pipe(
    Effect.flatMap(([aggregate, visibleSources]) =>
      Effect.gen(function* () {
        if (aggregate.npc && visibleSources(aggregate).length === 0)
          return yield* new PermissionDeniedError({
            code: "FORBIDDEN",
          });

        const projection = createReadyRoomProjection(
          aggregate,
          identity.discordId,
          aggregate.npc ? visibleSources(aggregate) : guildIds,
        );

        const sharesGuild = guildIds.some((id) =>
          aggregate.guildIds.includes(id),
        );

        return yield* projection && sharesGuild
          ? Effect.succeed(projection)
          : Effect.fail(new PermissionDeniedError({ code: "FORBIDDEN" }));
      }),
    ),
  );
