import { readyRoomSourceVisibility } from "./ready-room-visibility.js";

import { Effect } from "effect";
import type {
  PartyReadyRoomCharacter,
  PartyReadyRoomParticipant,
} from "@lootlog/schema/party-ready-room";

import {
  createReadyRoomClientUpdate,
  createReadyRoomProjection,
  getReadyRoomActiveRecipientDiscordIds,
} from "#src/messaging/ready-room/ready-room-projection";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";
import {
  ResourceConflictError,
  PermissionDeniedError,
  ResourceNotFoundError,
  InvalidEntityError,
} from "#src/shared/http/http-errors";
import type { PartyParticipantActionRequest } from "#src/contracts/party-ready-room/schemas";
import type { ReadyRoomIdentity } from "./party-ready-room.handlers.js";
import {
  assertCommitted,
  assertOrganizer,
  MAX_CAS_ATTEMPTS,
} from "./ready-room-cas.js";
import type { ReadyRoomContext } from "./ready-room.data-layer.js";

const createParticipant = (
  discordId: string,
  character: PartyReadyRoomCharacter,
  participantId: string,
  timestamp: string,
): PartyReadyRoomParticipant => ({
  participantId,
  discordId,
  character: structuredClone(character),
  partyPresence: "OUTSIDE",
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const exitParticipant = Effect.fnUntraced(function* (
  context: ReadyRoomContext,
  aggregate: ReadyRoomAggregate,
  participantId: string,
) {
  const participants = { ...aggregate.participants };
  delete participants[participantId];

  return yield* context.repository.exitParticipant(
    aggregate,
    {
      ...aggregate,
      revision: aggregate.revision + 1,
      updatedAt: new Date(context.clock()).toISOString(),
      participants,
    },
    participantId,
  );
});

export const joinWithRetry = (
  context: ReadyRoomContext,
  discordId: string,
  notificationId: string,
  character: PartyReadyRoomCharacter,
  world: string,
  guildIds: ReadonlyArray<string>,
  attempt: number,
): Effect.Effect<unknown, unknown> =>
  Effect.gen(function* () {
    const aggregate = yield* context.getLive(notificationId);

    // Organizing is Margonem-account-wide: none of the organizer
    // account's characters may join, other accounts of the same
    // Discord user may.
    if (aggregate.organizerCharacter.accountId === character.accountId) {
      return yield* Effect.fail(
        new ResourceConflictError({ code: "CHARACTER_ALREADY_JOINED" }),
      );
    }

    const visibleGuilds = yield* readyRoomSourceVisibility(
      context.database,
      discordId,
      guildIds,
    );

    const sharesGuild = visibleGuilds(aggregate).some((id) =>
      aggregate.guildIds.includes(id),
    );

    const meetsLevel =
      (aggregate.minLvl === undefined || character.lvl >= aggregate.minLvl) &&
      (aggregate.maxLvl === undefined || character.lvl <= aggregate.maxLvl);

    if (!sharesGuild || world !== aggregate.world || !meetsLevel) {
      return yield* Effect.fail(
        new PermissionDeniedError({ code: "INELIGIBLE_CHARACTER" }),
      );
    }

    const existing = Object.values(aggregate.participants).find(
      (participant) =>
        participant.character.characterId === character.characterId,
    );

    if (existing) {
      if (
        existing.discordId !== discordId ||
        existing.character.accountId !== character.accountId
      ) {
        return yield* Effect.fail(
          new ResourceConflictError({ code: "CHARACTER_ALREADY_JOINED" }),
        );
      }

      return yield* context.projectionForViewer(aggregate, discordId);
    }

    const updatedAt = new Date(context.clock()).toISOString();
    const participantId = context.idGenerator();

    const next: ReadyRoomAggregate = {
      ...aggregate,
      revision: aggregate.revision + 1,
      updatedAt,
      participants: {
        ...aggregate.participants,
        [participantId]: createParticipant(
          discordId,
          character,
          participantId,
          updatedAt,
        ),
      },
    };

    if (
      aggregate.partyState?.status === "OBSERVED" &&
      aggregate.partyState.members.some(
        (member) => member.characterId === character.characterId,
      )
    ) {
      next.participants[participantId].partyPresence = "IN_PARTY";
    }

    const recipients = yield* context.preparePublication(aggregate, [
      ...getReadyRoomActiveRecipientDiscordIds(aggregate),
      discordId,
    ]);

    const viewerGuildIds = yield* context.projectionGuildIds(
      aggregate,
      discordId,
    );

    const result = yield* context.repository.join(
      aggregate,
      next,
      participantId,
    );

    if (result.status === "joined-elsewhere") {
      return yield* Effect.fail(
        new ResourceConflictError({
          code: "ALREADY_JOINED_ELSEWHERE",
          details: { notificationId: result.notificationId },
        }),
      );
    }

    if (result.status === "missing") {
      return yield* Effect.fail(
        new ResourceNotFoundError({ code: "ROOM_EXPIRED" }),
      );
    }

    if (result.status === "conflict") {
      return attempt + 1 >= MAX_CAS_ATTEMPTS
        ? yield* Effect.fail(
            new ResourceConflictError({ code: "REVISION_CONFLICT" }),
          )
        : yield* joinWithRetry(
            context,
            discordId,
            notificationId,
            character,
            world,
            guildIds,
            attempt + 1,
          );
    }

    yield* context.publish(result.aggregate, recipients);

    return createReadyRoomProjection(
      result.aggregate,
      discordId,
      viewerGuildIds,
    );
  });

export const withdrawWithRetry = (
  context: ReadyRoomContext,
  discordId: string,
  notificationId: string,
  participantId: string,
  attempt: number,
): Effect.Effect<unknown, unknown> =>
  Effect.gen(function* () {
    const aggregate = yield* context.getLive(notificationId);
    const participant = aggregate.participants[participantId];

    if (!participant || participant.discordId !== discordId) {
      return yield* Effect.fail(
        new PermissionDeniedError({ code: "FORBIDDEN" }),
      );
    }

    const recipients = yield* context.preparePublication(
      aggregate,
      getReadyRoomActiveRecipientDiscordIds(aggregate),
    );

    const viewerGuildIds = yield* context.projectionGuildIds(
      aggregate,
      discordId,
    );

    const result = yield* exitParticipant(context, aggregate, participantId);

    if (result.status === "missing") {
      return yield* Effect.fail(
        new ResourceNotFoundError({ code: "ROOM_EXPIRED" }),
      );
    }

    if (result.status === "conflict") {
      return attempt + 1 >= MAX_CAS_ATTEMPTS
        ? yield* Effect.fail(
            new ResourceConflictError({ code: "REVISION_CONFLICT" }),
          )
        : yield* withdrawWithRetry(
            context,
            discordId,
            notificationId,
            participantId,
            attempt + 1,
          );
    }

    yield* context.publish(result.aggregate, recipients);

    return createReadyRoomClientUpdate(
      result.aggregate,
      discordId,
      viewerGuildIds,
    );
  });

export const removeParticipant = (
  context: ReadyRoomContext,
  identity: ReadyRoomIdentity,
  notificationId: string,
  payload: PartyParticipantActionRequest,
) =>
  Effect.gen(function* () {
    const aggregate = yield* context.getLive(notificationId);
    yield* assertOrganizer(
      aggregate,
      identity.discordId,
      payload.expectedRevision,
    );

    if (!aggregate.participants[payload.participantId]) {
      return yield* Effect.fail(
        new InvalidEntityError({
          code: "INVALID_STATE_TRANSITION",
        }),
      );
    }

    const recipients = yield* context.preparePublication(
      aggregate,
      getReadyRoomActiveRecipientDiscordIds(aggregate),
    );

    const viewerGuildIds = yield* context.projectionGuildIds(
      aggregate,
      identity.discordId,
    );

    const result = yield* exitParticipant(
      context,
      aggregate,
      payload.participantId,
    ).pipe(Effect.flatMap(assertCommitted));

    yield* context.publish(result.aggregate, recipients);

    return createReadyRoomClientUpdate(
      result.aggregate,
      identity.discordId,
      viewerGuildIds,
    );
  });
