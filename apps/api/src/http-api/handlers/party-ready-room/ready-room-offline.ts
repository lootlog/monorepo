import type { GameCharacterOffline } from "@lootlog/protocol/rabbit/events";

import { Effect } from "effect";

import { getReadyRoomActiveRecipientDiscordIds } from "#src/messaging/ready-room/ready-room-projection";
import { ResourceConflictError } from "#src/shared/http/http-errors";
import { MAX_CAS_ATTEMPTS } from "./ready-room-cas.js";
import type { ReadyRoomContext } from "./ready-room.data-layer.js";
import { cancelAggregate } from "./ready-room-lifecycle.js";
import { exitParticipant } from "./ready-room-participation.js";

const offlineRoom = (
  context: ReadyRoomContext,
  notificationId: string,
  event: typeof GameCharacterOffline.Type,
  attempt = 0,
): Effect.Effect<void, unknown> =>
  Effect.gen(function* () {
    const aggregate = yield* context.repository.get(notificationId);

    if (
      !aggregate ||
      aggregate.status !== "ACTIVE" ||
      aggregate.world !== event.world ||
      Date.parse(aggregate.createdAt) > event.disconnectedAt ||
      !aggregate.guildIds.some((id) => event.organizationIds.includes(id))
    )
      return;

    if (
      aggregate.organizerDiscordId === event.discordId &&
      aggregate.organizerCharacter.characterId === event.characterId
    ) {
      yield* cancelAggregate(
        context,
        aggregate,
        yield* context.preparePublication(
          aggregate,
          getReadyRoomActiveRecipientDiscordIds(aggregate),
        ),
      );

      return;
    }

    const participant = Object.values(aggregate.participants).find(
      (entry) =>
        entry.discordId === event.discordId &&
        entry.character.characterId === event.characterId &&
        Date.parse(entry.createdAt) <= event.disconnectedAt,
    );

    if (!participant) return;

    const recipients = yield* context.preparePublication(
      aggregate,
      getReadyRoomActiveRecipientDiscordIds(aggregate),
    );

    const result = yield* exitParticipant(
      context,
      aggregate,
      participant.participantId,
    );

    if (result.status === "conflict")
      return yield* Effect.fail(
        new ResourceConflictError({ code: "REVISION_CONFLICT" }),
      );

    if (result.status === "committed")
      yield* context.publish(result.aggregate, recipients);
  }).pipe(
    Effect.catchIf(
      (error) =>
        error instanceof ResourceConflictError &&
        attempt + 1 < MAX_CAS_ATTEMPTS,
      () => offlineRoom(context, notificationId, event, attempt + 1),
    ),
  );

export const characterOffline = (
  context: ReadyRoomContext,
  event: typeof GameCharacterOffline.Type,
) =>
  context.repository
    .findForUser(event.discordId)
    .pipe(
      Effect.flatMap((rooms) =>
        Effect.forEach(
          rooms,
          (room) => offlineRoom(context, room.notificationId, event),
          { discard: true },
        ),
      ),
    );
