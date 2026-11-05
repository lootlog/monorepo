import { Effect } from "effect";
import { isEqual } from "es-toolkit";
import {
  PARTY_OBSERVATION_REFRESH_MS,
  type PartyGatheringPartyMember,
} from "@lootlog/schema/party-ready-room";

import {
  createGatheringCharacter,
  createReadyRoomProjection,
  getReadyRoomActiveRecipientDiscordIds,
} from "#src/messaging/ready-room/ready-room-projection";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";
import {
  ResourceConflictError,
  PermissionDeniedError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import type { ResolvePartyInvitationsRequest } from "#src/contracts/party-ready-room/schemas";
import type { ReadyRoomIdentity } from "./party-ready-room.handlers.js";
import { MAX_CAS_ATTEMPTS } from "./ready-room-cas.js";
import type { ReadyRoomContext } from "./ready-room.data-layer.js";

// Observed IDs are authoritative; reported, registered, and previously
// observed details fill each member's display fields in that priority.
const observePartyMembers = (
  aggregate: ReadyRoomAggregate,
  memberIds: ReadonlySet<string>,
  members: ReadonlyArray<PartyGatheringPartyMember> | undefined,
): PartyGatheringPartyMember[] => {
  const knownCharacters = new Map([
    [
      aggregate.organizerCharacter.characterId,
      createGatheringCharacter(aggregate.organizerCharacter),
    ],
    ...Object.values(aggregate.participants).map(
      ({ character }) =>
        [character.characterId, createGatheringCharacter(character)] as const,
    ),
  ]);

  const previousMembers =
    aggregate.partyState?.status === "OBSERVED"
      ? aggregate.partyState.members
      : [];

  const observedMembers = new Map(
    (members ?? []).map((member) => [member.characterId, member]),
  );

  return [...memberIds].sort().map((characterId) => ({
    ...previousMembers.find((member) => member.characterId === characterId),
    ...knownCharacters.get(characterId),
    ...observedMembers.get(characterId),
    characterId,
  }));
};

const isFreshObservation = (
  aggregate: ReadyRoomAggregate,
  partyMembers: ReadonlyArray<PartyGatheringPartyMember>,
  now: number,
) =>
  aggregate.partyState?.status === "OBSERVED" &&
  isEqual(aggregate.partyState.members, partyMembers) &&
  now - Date.parse(aggregate.partyState.observedAt) <
    PARTY_OBSERVATION_REFRESH_MS;

export const observeWithRetry = (
  context: ReadyRoomContext,
  discordId: string,
  notificationId: string,
  organizerAccountId: string,
  organizerCharacterId: string,
  memberCharacterIds: ReadonlyArray<string>,
  members: ReadonlyArray<PartyGatheringPartyMember> | undefined,
  expectedRevision: number | undefined,
  attempt: number,
): Effect.Effect<unknown, unknown> =>
  Effect.gen(function* () {
    const aggregate = yield* context.getLive(notificationId);

    if (
      aggregate.organizerDiscordId !== discordId ||
      aggregate.organizerCharacter.accountId !== organizerAccountId ||
      aggregate.organizerCharacter.characterId !== organizerCharacterId
    ) {
      return yield* Effect.fail(
        new PermissionDeniedError({ code: "FORBIDDEN" }),
      );
    }

    if (
      expectedRevision !== undefined &&
      aggregate.revision !== expectedRevision
    ) {
      return yield* Effect.fail(
        new ResourceConflictError({ code: "REVISION_CONFLICT" }),
      );
    }

    const memberIds = new Set(memberCharacterIds);

    const partyMembers = observePartyMembers(aggregate, memberIds, members);

    const participants = structuredClone(aggregate.participants);
    const updatedAt = new Date(context.clock()).toISOString();
    const changed: string[] = [];

    for (const participant of Object.values(participants)) {
      const presence = memberIds.has(participant.character.characterId)
        ? "IN_PARTY"
        : "OUTSIDE";

      if (participant.partyPresence !== presence) {
        participant.partyPresence = presence;
        participant.updatedAt = updatedAt;
        changed.push(participant.discordId);
      }
    }

    // Only unversioned reports may skip an unchanged, fresh observation.
    // A versioned report always advances the revision: after a client
    // timeout, the retry can carry the same expectedRevision as the
    // request still in flight, and skipping the bump would let that older
    // roster overwrite the acknowledged one. Heartbeats are longer than
    // the refresh window, so they would commit a new revision anyway.
    if (
      expectedRevision === undefined &&
      changed.length === 0 &&
      aggregate.partyMemberCount === memberIds.size &&
      isFreshObservation(aggregate, partyMembers, context.clock())
    ) {
      return yield* context.projectionForViewer(aggregate, discordId);
    }

    const next: ReadyRoomAggregate = {
      ...aggregate,
      revision: aggregate.revision + 1,
      updatedAt,
      participants,
      partyMemberCount: memberIds.size,
      partyState: {
        status: "OBSERVED",
        observedAt: updatedAt,
        members: partyMembers,
      },
    };

    const recipients = yield* context.preparePublication(
      aggregate,
      getReadyRoomActiveRecipientDiscordIds(aggregate),
    );

    const viewerGuildIds = yield* context.projectionGuildIds(
      aggregate,
      discordId,
    );

    const result = yield* context.repository.commit(aggregate, next);

    if (result.status === "missing") {
      return yield* Effect.fail(
        new ResourceNotFoundError({ code: "ROOM_EXPIRED" }),
      );
    }

    if (result.status === "conflict") {
      return expectedRevision !== undefined || attempt + 1 >= MAX_CAS_ATTEMPTS
        ? yield* Effect.fail(
            new ResourceConflictError({ code: "REVISION_CONFLICT" }),
          )
        : yield* observeWithRetry(
            context,
            discordId,
            notificationId,
            organizerAccountId,
            organizerCharacterId,
            memberCharacterIds,
            members,
            expectedRevision,
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

export const resolveInvitationTargets = (
  context: ReadyRoomContext,
  identity: ReadyRoomIdentity,
  notificationId: string,
  payload: ResolvePartyInvitationsRequest,
) =>
  Effect.gen(function* () {
    const aggregate = yield* context.getLive(notificationId);

    if (aggregate.organizerDiscordId !== identity.discordId) {
      return yield* Effect.fail(
        new PermissionDeniedError({ code: "FORBIDDEN" }),
      );
    }

    const characters = new Set<string>();

    const targets = [...new Set(payload.participantIds)].flatMap(
      (participantId) => {
        const participant = aggregate.participants[participantId];

        if (
          !participant ||
          participant.partyPresence !== "OUTSIDE" ||
          characters.has(participant.character.characterId)
        ) {
          return [];
        }

        characters.add(participant.character.characterId);

        return [
          {
            participantId,
            characterId: participant.character.characterId,
          },
        ];
      },
    );

    return { targets };
  });
