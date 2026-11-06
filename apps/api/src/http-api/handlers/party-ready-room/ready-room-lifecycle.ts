import { ignorePublicationFailure } from "#src/shared/best-effort-publication";
import { Effect } from "effect";

import {
  createReadyRoomClientUpdate,
  createReadyRoomProjection,
  getReadyRoomActiveRecipientDiscordIds,
} from "#src/messaging/ready-room/ready-room-projection";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";
import { ResourceConflictError } from "#src/shared/http/http-errors";
import type {
  CreatePartyGatheringRequest,
  PartyRevisionRequest,
} from "#src/contracts/party-ready-room/schemas";
import type { ReadyRoomIdentity } from "./party-ready-room.handlers.js";
import { assertCommitted, assertOrganizer } from "./ready-room-cas.js";
import type { ReadyRoomContext } from "./ready-room.data-layer.js";

export const ROOM_LIFETIME_MS = 30 * 60 * 1000;

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
      expiresAt: new Date(now + ROOM_LIFETIME_MS).toISOString(),
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
