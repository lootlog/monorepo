import { readyRoomSourceVisibility } from "./ready-room-visibility.js";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import { apiKeyAccessibleGuilds } from "#src/runtime/auth/organization-scope";
import { randomUUID } from "node:crypto";

import { Effect, Layer } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { NOTIFICATION_SEND_PERMISSIONS } from "@lootlog/domain/npc-permissions";
import type {
  PartyGatheringNpc,
  PartyGatheringUpdateEnvelope,
  PartyReadyRoomCharacter,
  PartyReadyRoomUpdateEnvelope,
} from "@lootlog/schema/party-ready-room";
import { ApiDatabase } from "#src/database/drizzle/database";

import {
  createReadyRoomClientUpdate,
  createReadyRoomProjection,
} from "#src/messaging/ready-room/ready-room-projection";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";
import { makeReadyRoomPublicationOutbox } from "#src/messaging/ready-room/ready-room-publication-outbox";
import {
  ResourceConflictError,
  PermissionDeniedError,
  ResourceNotFoundError,
  InvalidEntityError,
} from "#src/shared/http/http-errors";
import {
  ReadyRoomData,
  ReadyRoomOperationError,
} from "./party-ready-room.handlers.js";
import {
  cancelRoom,
  createRoom,
  ROOM_LIFETIME_MS,
} from "./ready-room-lifecycle.js";
import { characterOffline } from "./ready-room-offline.js";
import {
  joinWithRetry,
  removeParticipant,
  withdrawWithRetry,
} from "./ready-room-participation.js";
import {
  observeWithRetry,
  resolveInvitationTargets,
} from "./ready-room-party.js";
import { activeRooms, getRoom, listRooms } from "./ready-room-queries.js";
import {
  makeReadyRoomRepository,
  type ReadyRoomRedis,
} from "./ready-room.repository.js";

export interface ReadyRoomEffects {
  readonly publishGatheringUpdate: (
    envelope: PartyGatheringUpdateEnvelope,
  ) => Effect.Effect<void, unknown>;
  readonly publishCancellation: (payload: {
    readonly notificationId: string;
    readonly guildId: string;
  }) => Effect.Effect<void, unknown>;
  readonly publishGathering: (payload: {
    readonly notificationId: string;
    readonly guildId: string;
    readonly discordId: string;
    readonly character: PartyReadyRoomCharacter;
    readonly world: string;
    readonly createdAt: string;
    readonly description?: string;
    readonly minLvl?: number;
    readonly maxLvl?: number;
  }) => Effect.Effect<void, unknown>;
  readonly publish: (
    envelope: PartyReadyRoomUpdateEnvelope,
  ) => Effect.Effect<void, unknown>;
  readonly endPartyGatheringMessages: (
    notificationId: string,
    guildIds: ReadonlyArray<string>,
  ) => Effect.Effect<void, unknown>;
}

export const createReadyRoomForNotification = (
  redis: ReadyRoomRedis,
  effects: Pick<ReadyRoomEffects, "publish" | "publishGatheringUpdate">,
  input: {
    readonly npc?: PartyGatheringNpc;
    readonly notificationId: string;
    readonly organizerDiscordId: string;
    readonly organizerCharacter: PartyReadyRoomCharacter;
    readonly guildId: string;
    readonly world: string;
  },
  clock: () => number = Date.now,
) => {
  const now = clock();
  const timestamp = new Date(now).toISOString();

  const gatheringPublications = makeReadyRoomPublicationOutbox(
    redis,
    effects.publishGatheringUpdate,
    clock,
  );

  const aggregate: ReadyRoomAggregate = {
    schemaVersion: 3,
    notificationId: input.notificationId,
    organizerDiscordId: input.organizerDiscordId,
    organizerCharacter: structuredClone(input.organizerCharacter),
    guildIds: [input.guildId],
    world: input.world,
    status: "ACTIVE",
    revision: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt: new Date(now + ROOM_LIFETIME_MS).toISOString(),
    participants: {},
  };

  if (input.npc) aggregate.npc = input.npc;

  return makeReadyRoomRepository(redis, clock)
    .create(aggregate)
    .pipe(
      Effect.flatMap((result) => {
        if (result.status === "active-room-exists") {
          return Effect.fail(
            new ResourceConflictError({
              code: "ACTIVE_GATHERING_EXISTS",
              details: { notificationId: result.notificationId },
            }),
          );
        }

        if (result.status === "joined-elsewhere") {
          return Effect.fail(
            new ResourceConflictError({
              code: "ALREADY_JOINED_ELSEWHERE",
              details: { notificationId: result.notificationId },
            }),
          );
        }

        if (result.status === "room-exists") {
          return Effect.fail(
            new ResourceConflictError({ code: "REVISION_CONFLICT" }),
          );
        }

        const envelope: PartyReadyRoomUpdateEnvelope = {
          recipientDiscordId: input.organizerDiscordId,
          eligibleGuildIds: [...result.aggregate.guildIds],
          update: createReadyRoomClientUpdate(
            result.aggregate,
            input.organizerDiscordId,
          ),
        };

        return effects
          .publish(envelope)
          .pipe(
            Effect.ignore,
            Effect.andThen(gatheringPublications.publish(result.aggregate)),
            Effect.as(result.aggregate),
          );
      }),
    );
};

/**
 * Dependencies and Organization-scoped access, projection, and publication
 * helpers shared by every ready-room operation, built once per data layer.
 */
const makeReadyRoomContext = (
  redis: ReadyRoomRedis,
  effects: ReadyRoomEffects,
  clock: () => number,
  idGenerator: () => string,
  database: typeof ApiDatabase.Service,
) => {
  const repository = makeReadyRoomRepository(redis, clock);

  const gatheringPublications = makeReadyRoomPublicationOutbox(
    redis,
    effects.publishGatheringUpdate,
    clock,
  );

  const accessibleGuildIds = (discordId: string, includeReadable = false) =>
    selectAccessibleGuilds(
      database,
      discordId,
      includeReadable
        ? [...NOTIFICATION_SEND_PERMISSIONS, Permission.LOOTLOG_CHAT_READ]
        : NOTIFICATION_SEND_PERMISSIONS,
    ).pipe(Effect.map((rows) => rows.map(({ guild }) => guild.id)));

  const projectionGuildIds = (
    aggregate: ReadyRoomAggregate,
    discordId: string,
  ) =>
    accessibleGuildIds(discordId, true).pipe(
      Effect.flatMap((guildIds) =>
        aggregate.npc
          ? readyRoomSourceVisibility(database, discordId, guildIds).pipe(
              Effect.map((visible) => visible(aggregate)),
            )
          : Effect.succeed(
              aggregate.guildIds.filter((id) => guildIds.includes(id)),
            ),
      ),
    );

  const projectionForViewer = (
    aggregate: ReadyRoomAggregate,
    discordId: string,
  ) =>
    projectionGuildIds(aggregate, discordId).pipe(
      Effect.map((guildIds) =>
        createReadyRoomProjection(aggregate, discordId, guildIds),
      ),
    );

  const preparePublication = (
    aggregate: ReadyRoomAggregate,
    recipients: ReadonlyArray<string>,
  ) =>
    Effect.forEach(
      [...new Set(recipients)],
      (recipientDiscordId) =>
        projectionGuildIds(aggregate, recipientDiscordId).pipe(
          Effect.map((guildIds) => ({ recipientDiscordId, guildIds })),
        ),
      { concurrency: 4 },
    );

  const publish = (
    aggregate: ReadyRoomAggregate,
    recipients: ReadonlyArray<{
      recipientDiscordId: string;
      guildIds: string[];
    }>,
  ) =>
    Effect.forEach(
      recipients,
      ({ recipientDiscordId, guildIds }) => {
        const update = createReadyRoomClientUpdate(
          aggregate,
          recipientDiscordId,
          guildIds,
        );

        return effects
          .publish({
            recipientDiscordId,
            eligibleGuildIds:
              update.type === "UPSERT"
                ? update.projection.guildIds
                : [...aggregate.guildIds],
            update,
          })
          .pipe(Effect.ignore);
      },
      { concurrency: "unbounded", discard: true },
    ).pipe(Effect.andThen(gatheringPublications.publish(aggregate)));

  const getLive = (notificationId: string) =>
    repository.get(notificationId).pipe(
      Effect.flatMap((aggregate) =>
        Effect.gen(function* () {
          if (!aggregate || Date.parse(aggregate.expiresAt) <= clock()) {
            return yield* Effect.fail(
              new ResourceNotFoundError({ code: "ROOM_EXPIRED" }),
            );
          }

          const keyScope = yield* apiKeyAccessibleGuilds(
            database,
            NOTIFICATION_SEND_PERMISSIONS,
          );

          if (keyScope) {
            const accessible = new Set(keyScope.map(({ id }) => id));

            if (!aggregate.guildIds.every((id) => accessible.has(id))) {
              return yield* Effect.fail(
                new PermissionDeniedError({ code: "FORBIDDEN" }),
              );
            }
          }

          return yield* aggregate.status === "ACTIVE"
            ? Effect.succeed(aggregate)
            : Effect.fail(
                new InvalidEntityError({
                  code: "INVALID_STATE_TRANSITION",
                }),
              );
        }),
      ),
    );

  return {
    repository,
    database,
    effects,
    clock,
    idGenerator,
    accessibleGuildIds,
    projectionGuildIds,
    projectionForViewer,
    preparePublication,
    publish,
    getLive,
  };
};

export type ReadyRoomContext = ReturnType<typeof makeReadyRoomContext>;

const operation = <A, E>(effect: Effect.Effect<A, E>) =>
  effect.pipe(
    Effect.mapError((cause) => new ReadyRoomOperationError({ cause })),
  );

export const makeReadyRoomDataLayer = (
  redis: ReadyRoomRedis,
  effects: ReadyRoomEffects,
  clock: () => number = Date.now,
  idGenerator: () => string = randomUUID,
) =>
  Layer.effect(
    ReadyRoomData,
    Effect.map(ApiDatabase, (database) => {
      const context = makeReadyRoomContext(
        redis,
        effects,
        clock,
        idGenerator,
        database,
      );

      return ReadyRoomData.of({
        characterOffline: (event) =>
          operation(characterOffline(context, event)),
        accessibleGuildIds: (discordId, includeReadable) =>
          operation(context.accessibleGuildIds(discordId, includeReadable)),
        create: (identity, guildId, payload) =>
          operation(createRoom(context, identity, guildId, payload)),
        active: (identity, guildIds, world) =>
          operation(activeRooms(context, identity, guildIds, world)),
        list: (identity, guildIds) =>
          operation(listRooms(context, identity, guildIds)),
        get: (identity, notificationId, guildIds) =>
          operation(getRoom(context, identity, notificationId, guildIds)),
        apply: (identity, notificationId, guildIds, payload) =>
          operation(
            joinWithRetry(
              context,
              identity.discordId,
              notificationId,
              payload.character,
              payload.world,
              guildIds,
              0,
            ),
          ),
        withdraw: (identity, notificationId, payload) =>
          operation(
            withdrawWithRetry(
              context,
              identity.discordId,
              notificationId,
              payload.participantId,
              0,
            ),
          ),
        remove: (identity, notificationId, payload) =>
          operation(
            removeParticipant(context, identity, notificationId, payload),
          ),
        resolveInvitationTargets: (identity, notificationId, payload) =>
          operation(
            resolveInvitationTargets(
              context,
              identity,
              notificationId,
              payload,
            ),
          ),
        observeParty: (identity, notificationId, payload) =>
          operation(
            observeWithRetry(
              context,
              identity.discordId,
              notificationId,
              payload.organizerAccountId,
              payload.organizerCharacterId,
              payload.memberCharacterIds,
              payload.members,
              payload.expectedRevision,
              0,
            ),
          ),
        cancel: (identity, notificationId, payload) =>
          operation(cancelRoom(context, identity, notificationId, payload)),
      });
    }),
  );
