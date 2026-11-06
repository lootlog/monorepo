import { ignorePublicationFailure } from "#src/shared/best-effort-publication";
import { Effect } from "effect";
import { PARTY_GATHERING_LIFETIME_MS } from "@lootlog/schema/party-ready-room";

import {
  createReadyRoomClientUpdate,
  createReadyRoomProjection,
  getReadyRoomActiveRecipientDiscordIds,
} from "#src/messaging/ready-room/ready-room-projection";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import type { PartyGatheringEndReason } from "#src/http-api/handlers/chat/chat.data-layer";
import type {
  CreatePartyGatheringRequest,
  PartyRevisionRequest,
} from "#src/contracts/party-ready-room/schemas";
import type { ReadyRoomIdentity } from "./party-ready-room.handlers.js";
import {
  assertCommitted,
  assertOrganizer,
  MAX_CAS_ATTEMPTS,
} from "./ready-room-cas.js";
import type { ReadyRoomContext } from "./ready-room.data-layer.js";

export const createRoom = (
  context: ReadyRoomContext,
  identity: ReadyRoomIdentity,
  guildId: string,
  payload: CreatePartyGatheringRequest,
) =>
  Effect.gen(function* () {
    const now = context.clock();
    const timestamp = new Date(now).toISOString();

    const aggregate: ReadyRoomAggregate = {
      schemaVersion: 3,
      notificationId: context.idGenerator(),
      organizerDiscordId: identity.discordId,
      organizerCharacter: structuredClone(payload.character),
      guildIds: [guildId],
      world: payload.world,
      status: "ACTIVE",
      revision: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt: new Date(now + PARTY_GATHERING_LIFETIME_MS).toISOString(),
      participants: {},
    };

    if (payload.description !== undefined)
      aggregate.description = payload.description;

    if (payload.minLvl !== undefined) aggregate.minLvl = payload.minLvl;

    if (payload.maxLvl !== undefined) aggregate.maxLvl = payload.maxLvl;

    const recipients = yield* context.preparePublication(aggregate, [
      identity.discordId,
    ]);

    const result = yield* context.repository.create(aggregate);

    if (result.status === "active-room-exists") {
      return yield* Effect.fail(
        new ResourceConflictError({
          code: "ACTIVE_GATHERING_EXISTS",
          details: { notificationId: result.notificationId },
        }),
      );
    }

    if (result.status === "joined-elsewhere") {
      return yield* Effect.fail(
        new ResourceConflictError({
          code: "ALREADY_JOINED_ELSEWHERE",
          details: { notificationId: result.notificationId },
        }),
      );
    }

    if (result.status === "room-exists") {
      return yield* Effect.fail(
        new ResourceConflictError({ code: "REVISION_CONFLICT" }),
      );
    }

    yield* context.publish(result.aggregate, recipients);
    yield* context.effects
      .publishGathering({
        notificationId: result.aggregate.notificationId,
        guildId,
        discordId: identity.discordId,
        character: result.aggregate.organizerCharacter,
        world: result.aggregate.world,
        createdAt: result.aggregate.createdAt,
        ...(result.aggregate.description !== undefined && {
          description: result.aggregate.description,
        }),
        ...(result.aggregate.minLvl !== undefined && {
          minLvl: result.aggregate.minLvl,
        }),
        ...(result.aggregate.maxLvl !== undefined && {
          maxLvl: result.aggregate.maxLvl,
        }),
      })
      .pipe(ignorePublicationFailure);

    return createReadyRoomProjection(result.aggregate, identity.discordId);
  }).pipe(
    Effect.withSpan("PartyReadyRoomControllerCreate.redis", {
      attributes: { adapter: "ReadyRoomRedis", retryCount: 0 },
    }),
  );

export const cancelAggregate = Effect.fnUntraced(function* (
  context: ReadyRoomContext,
  aggregate: ReadyRoomAggregate,
  recipients: ReadonlyArray<{
    recipientDiscordId: string;
    guildIds: string[];
  }>,
  reason: PartyGatheringEndReason = "ENDED",
) {
  const next: ReadyRoomAggregate = {
    ...aggregate,
    status: "CANCELLED",
    revision: aggregate.revision + 1,
    updatedAt: new Date(context.clock()).toISOString(),
  };

  const result = yield* context.repository
    .terminate(aggregate, next)
    .pipe(Effect.flatMap(assertCommitted));

  yield* Effect.all(
    [
      Effect.forEach(
        result.aggregate.guildIds,
        (guildId) =>
          context.effects
            .publishCancellation({
              notificationId: result.aggregate.notificationId,
              guildId,
            })
            .pipe(ignorePublicationFailure),
        { concurrency: "unbounded", discard: true },
      ),
      context.publish(result.aggregate, recipients),
      // The cancellation is committed and retries cannot repeat it, so a chat
      // cleanup failure must neither skip publications nor fail the request.
      context.effects
        .endPartyGatheringMessages(
          result.aggregate.notificationId,
          result.aggregate.guildIds,
          reason,
        )
        .pipe(
          Effect.catch(() =>
            Effect.logError(
              "Cancelled gathering chat messages remain unchanged",
            ).pipe(
              Effect.annotateLogs({
                notificationId: result.aggregate.notificationId,
              }),
            ),
          ),
        ),
    ],
    { concurrency: "unbounded", discard: true },
  );

  return result.aggregate;
});

export const cancelRoom = (
  context: ReadyRoomContext,
  identity: ReadyRoomIdentity,
  notificationId: string,
  payload: PartyRevisionRequest,
) =>
  Effect.gen(function* () {
    const aggregate = yield* context.getLive(notificationId);
    yield* assertOrganizer(
      aggregate,
      identity.discordId,
      payload.expectedRevision,
    );

    const { recipients, viewerGuildIds } =
      yield* context.preparePublicationForViewer(
        aggregate,
        getReadyRoomActiveRecipientDiscordIds(aggregate),
        identity.discordId,
      );

    const cancelled = yield* cancelAggregate(context, aggregate, recipients);

    return createReadyRoomClientUpdate(
      cancelled,
      identity.discordId,
      viewerGuildIds,
    );
  }).pipe(
    Effect.withSpan("PartyReadyRoomControllerCancel.redis", {
      attributes: { adapter: "ReadyRoomRedis", retryCount: 0 },
    }),
  );

/** Restarts the organizer's gathering lifetime from now. */
export const extendRoom = (
  context: ReadyRoomContext,
  identity: ReadyRoomIdentity,
  notificationId: string,
  payload: PartyRevisionRequest,
) =>
  Effect.gen(function* () {
    const aggregate = yield* context.getLive(notificationId);
    yield* assertOrganizer(
      aggregate,
      identity.discordId,
      payload.expectedRevision,
    );

    const now = context.clock();

    const next: ReadyRoomAggregate = {
      ...aggregate,
      revision: aggregate.revision + 1,
      updatedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + PARTY_GATHERING_LIFETIME_MS).toISOString(),
    };

    const { recipients, viewerGuildIds } =
      yield* context.preparePublicationForViewer(
        aggregate,
        getReadyRoomActiveRecipientDiscordIds(aggregate),
        identity.discordId,
      );

    const result = yield* context.repository
      .extend(aggregate, next)
      .pipe(Effect.flatMap(assertCommitted));

    yield* context.publish(result.aggregate, recipients);

    return createReadyRoomProjection(
      result.aggregate,
      identity.discordId,
      viewerGuildIds,
    );
  }).pipe(
    Effect.withSpan("PartyReadyRoomControllerExtend.redis", {
      attributes: { adapter: "ReadyRoomRedis", retryCount: 0 },
    }),
  );

export interface ReadyRoomNpcKill {
  // The Lootlogs that recorded the kill as their own timer.
  readonly guildIds: ReadonlyArray<string>;
  readonly world: string;
  readonly npcId: number;
  readonly location: string;
}

const closeKilledNpcRoom = (
  context: ReadyRoomContext,
  notificationId: string,
  attempt = 0,
): Effect.Effect<void, unknown> =>
  Effect.gen(function* () {
    const aggregate = yield* context.repository.get(notificationId);

    if (!aggregate || aggregate.status !== "ACTIVE") return;

    yield* cancelAggregate(
      context,
      aggregate,
      yield* context.preparePublication(
        aggregate,
        getReadyRoomActiveRecipientDiscordIds(aggregate),
      ),
      "NPC_KILLED",
    );
  }).pipe(
    Effect.catchIf(
      (error) =>
        error instanceof ResourceConflictError &&
        attempt + 1 < MAX_CAS_ATTEMPTS,
      () => closeKilledNpcRoom(context, notificationId, attempt + 1),
    ),
    // A room that expired meanwhile is already gone.
    Effect.catchIf(
      (error) => error instanceof ResourceNotFoundError,
      () => Effect.void,
    ),
  );

/**
 * Ends the gatherings for an NPC that their Lootlogs saw killed. Ending one
 * tells every Lootlog of the gathering why, so a gathering shared with a
 * Lootlog that did not record the kill stays open: another Organization's kill
 * never closes, or reveals itself through, its gatherings.
 */
export const closeKilledNpcRooms = (
  context: ReadyRoomContext,
  kill: ReadyRoomNpcKill,
) => {
  const killedIn = new Set(kill.guildIds);

  return context.repository.findActive(kill.guildIds, kill.world).pipe(
    Effect.flatMap((rooms) =>
      Effect.forEach(
        rooms.filter(
          (room) =>
            room.guildIds.every((guildId) => killedIn.has(guildId)) &&
            room.npc?.id === kill.npcId &&
            room.npc.location === kill.location,
        ),
        (room) => closeKilledNpcRoom(context, room.notificationId),
        { discard: true },
      ),
    ),
  );
};
