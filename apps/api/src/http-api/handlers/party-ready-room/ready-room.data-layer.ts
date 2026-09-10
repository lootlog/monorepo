import type { GameCharacterOffline } from "@lootlog/protocol/rabbit/events";
import { readyRoomSourceVisibility } from "./ready-room-visibility.js";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import {
  requestApiKeyAccess,
  requestScopedIdentity,
} from "#src/runtime/auth/forward-auth-identity";
import { randomUUID } from "node:crypto";

import { Effect, Layer } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { NOTIFICATION_SEND_PERMISSIONS } from "@lootlog/domain/npc-permissions";
import type {
  PartyGatheringNpc,
  PartyReadyRoomCharacter,
  PartyReadyRoomParticipant,
  PartyReadyRoomUpdateEnvelope,
} from "@lootlog/schema/party-ready-room";
import { ApiDatabase } from "#src/database/drizzle/database";

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
import {
  ReadyRoomData,
  ReadyRoomOperationError,
} from "./party-ready-room.handlers.js";
import {
  makeReadyRoomRepository,
  type ReadyRoomRedis,
  type CommitReadyRoomResult,
} from "./ready-room.repository.js";

const ROOM_LIFETIME_MS = 30 * 60 * 1000;
const MAX_CAS_ATTEMPTS = 4;

export interface ReadyRoomEffects {
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
  effects: Pick<ReadyRoomEffects, "publish">,
  input: {
    readonly npc?: PartyGatheringNpc;
    readonly notificationId: string;
    readonly organizerDiscordId: string;
    readonly organizerCharacter: PartyReadyRoomCharacter;
    readonly guildIds: ReadonlyArray<string>;
    readonly world: string;
  },
  clock: () => number = Date.now,
) => {
  const now = clock();
  const timestamp = new Date(now).toISOString();
  const aggregate: ReadyRoomAggregate = {
    schemaVersion: 3,
    notificationId: input.notificationId,
    organizerDiscordId: input.organizerDiscordId,
    organizerCharacter: structuredClone(input.organizerCharacter),
    guildIds: [...input.guildIds],
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
              notificationId: result.notificationId,
            }),
          );
        }
        if (result.status === "joined-elsewhere") {
          return Effect.fail(
            new ResourceConflictError({
              code: "ALREADY_JOINED_ELSEWHERE",
              notificationId: result.notificationId,
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
          .pipe(Effect.ignore, Effect.as(result.aggregate));
      }),
    );
};

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

export const makeReadyRoomDataLayer = (
  redis: ReadyRoomRedis,
  effects: ReadyRoomEffects,
  clock: () => number = Date.now,
  idGenerator: () => string = randomUUID,
) =>
  Layer.effect(
    ReadyRoomData,
    Effect.map(ApiDatabase, (database) => {
      const repository = makeReadyRoomRepository(redis, clock);
      const operation = <A, E>(effect: Effect.Effect<A, E>) =>
        effect.pipe(
          Effect.mapError((cause) => new ReadyRoomOperationError({ cause })),
        );
      const preparePublication = (
        aggregate: ReadyRoomAggregate,
        recipients: ReadonlyArray<string>,
      ) =>
        Effect.forEach([...new Set(recipients)], (recipientDiscordId) =>
          projectionGuildIds(aggregate, recipientDiscordId).pipe(
            Effect.map((guildIds) => ({ recipientDiscordId, guildIds })),
          ),
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
          { discard: true },
        );
      const getLive = (notificationId: string) =>
        repository.get(notificationId).pipe(
          Effect.flatMap((aggregate) =>
            Effect.gen(function* () {
              if (!aggregate || Date.parse(aggregate.expiresAt) <= clock()) {
                return yield* Effect.fail(
                  new ResourceNotFoundError({ code: "ROOM_EXPIRED" }),
                );
              }
              if (yield* requestApiKeyAccess) {
                const identity = yield* requestScopedIdentity;
                const accessible = yield* accessibleGuildIds(
                  identity.discordId,
                );
                if (
                  !aggregate.guildIds.every((id) => accessible.includes(id))
                ) {
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
      const assertOrganizer = (
        aggregate: ReadyRoomAggregate,
        discordId: string,
        revision: number,
      ) => {
        if (aggregate.organizerDiscordId !== discordId) {
          return Effect.fail(new PermissionDeniedError({ code: "FORBIDDEN" }));
        }
        return aggregate.revision === revision
          ? Effect.void
          : Effect.fail(
              new ResourceConflictError({ code: "REVISION_CONFLICT" }),
            );
      };
      const assertCommitted = (result: CommitReadyRoomResult) => {
        if (result.status === "missing") {
          return Effect.fail(
            new ResourceNotFoundError({ code: "ROOM_EXPIRED" }),
          );
        }
        if (result.status === "conflict") {
          return Effect.fail(
            new ResourceConflictError({ code: "REVISION_CONFLICT" }),
          );
        }
        return Effect.succeed(result);
      };

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

      const joinWithRetry = (
        discordId: string,
        notificationId: string,
        character: PartyReadyRoomCharacter,
        world: string,
        guildIds: ReadonlyArray<string>,
        attempt: number,
      ): Effect.Effect<unknown, unknown> =>
        Effect.gen(function* () {
          const aggregate = yield* getLive(notificationId);
          if (
            aggregate.organizerCharacter.characterId === character.characterId
          ) {
            return yield* Effect.fail(
              new ResourceConflictError({ code: "CHARACTER_ALREADY_JOINED" }),
            );
          }
          const visibleGuilds = yield* readyRoomSourceVisibility(
            database,
            discordId,
            guildIds,
          );
          const sharesGuild = visibleGuilds(aggregate).some((id) =>
            aggregate.guildIds.includes(id),
          );
          const meetsLevel =
            (aggregate.minLvl === undefined ||
              character.lvl >= aggregate.minLvl) &&
            (aggregate.maxLvl === undefined ||
              character.lvl <= aggregate.maxLvl);
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
            return yield* projectionForViewer(aggregate, discordId);
          }
          const updatedAt = new Date(clock()).toISOString();
          const participantId = idGenerator();
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
          const recipients = yield* preparePublication(aggregate, [
            aggregate.organizerDiscordId,
            discordId,
          ]);
          const viewerGuildIds = yield* projectionGuildIds(
            aggregate,
            discordId,
          );
          const result = yield* repository.join(aggregate, next, participantId);
          if (result.status === "joined-elsewhere") {
            return yield* Effect.fail(
              new ResourceConflictError({
                code: "ALREADY_JOINED_ELSEWHERE",
                notificationId: result.notificationId,
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
                  discordId,
                  notificationId,
                  character,
                  world,
                  guildIds,
                  attempt + 1,
                );
          }
          yield* publish(result.aggregate, recipients);
          return createReadyRoomProjection(
            result.aggregate,
            discordId,
            viewerGuildIds,
          );
        });

      const withdrawWithRetry = (
        discordId: string,
        notificationId: string,
        participantId: string,
        attempt: number,
      ): Effect.Effect<unknown, unknown> =>
        Effect.gen(function* () {
          const aggregate = yield* getLive(notificationId);
          const participant = aggregate.participants[participantId];
          if (!participant || participant.discordId !== discordId) {
            return yield* Effect.fail(
              new PermissionDeniedError({ code: "FORBIDDEN" }),
            );
          }
          const recipients = yield* preparePublication(
            aggregate,
            getReadyRoomActiveRecipientDiscordIds(aggregate),
          );
          const viewerGuildIds = yield* projectionGuildIds(
            aggregate,
            discordId,
          );
          const result = yield* exitParticipant(aggregate, participantId);
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
                  discordId,
                  notificationId,
                  participantId,
                  attempt + 1,
                );
          }
          yield* publish(result.aggregate, recipients);
          return createReadyRoomClientUpdate(
            result.aggregate,
            discordId,
            viewerGuildIds,
          );
        });

      const observeWithRetry = (
        discordId: string,
        notificationId: string,
        organizerAccountId: string,
        organizerCharacterId: string,
        memberCharacterIds: ReadonlyArray<string>,
        attempt: number,
      ): Effect.Effect<unknown, unknown> =>
        Effect.gen(function* () {
          const aggregate = yield* getLive(notificationId);
          if (
            aggregate.organizerDiscordId !== discordId ||
            aggregate.organizerCharacter.accountId !== organizerAccountId ||
            aggregate.organizerCharacter.characterId !== organizerCharacterId
          ) {
            return yield* Effect.fail(
              new PermissionDeniedError({ code: "FORBIDDEN" }),
            );
          }
          const memberIds = new Set(memberCharacterIds);
          const participants = structuredClone(aggregate.participants);
          const updatedAt = new Date(clock()).toISOString();
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
          if (
            changed.length === 0 &&
            aggregate.partyMemberCount === memberIds.size
          ) {
            return yield* projectionForViewer(aggregate, discordId);
          }
          const next: ReadyRoomAggregate = {
            ...aggregate,
            revision: aggregate.revision + 1,
            updatedAt,
            participants,
            partyMemberCount: memberIds.size,
          };
          const recipients = yield* preparePublication(
            aggregate,
            getReadyRoomActiveRecipientDiscordIds(aggregate),
          );
          const viewerGuildIds = yield* projectionGuildIds(
            aggregate,
            discordId,
          );
          const result = yield* repository.commit(aggregate, next);
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
              : yield* observeWithRetry(
                  discordId,
                  notificationId,
                  organizerAccountId,
                  organizerCharacterId,
                  memberCharacterIds,
                  attempt + 1,
                );
          }
          yield* publish(result.aggregate, recipients);
          return createReadyRoomProjection(
            result.aggregate,
            discordId,
            viewerGuildIds,
          );
        });

      const cancelAggregate = Effect.fnUntraced(function* (
        aggregate: ReadyRoomAggregate,
      ) {
        const recipients = yield* preparePublication(
          aggregate,
          getReadyRoomActiveRecipientDiscordIds(aggregate),
        );
        const next: ReadyRoomAggregate = {
          ...aggregate,
          status: "CANCELLED",
          revision: aggregate.revision + 1,
          updatedAt: new Date(clock()).toISOString(),
        };
        const result = yield* repository
          .terminate(aggregate, next)
          .pipe(Effect.flatMap(assertCommitted));
        yield* Effect.forEach(
          result.aggregate.guildIds,
          (guildId) =>
            effects
              .publishCancellation({
                notificationId: result.aggregate.notificationId,
                guildId,
              })
              .pipe(Effect.ignore),
          { discard: true },
        );
        yield* effects.endPartyGatheringMessages(
          result.aggregate.notificationId,
          result.aggregate.guildIds,
        );
        yield* publish(result.aggregate, recipients);
        return result.aggregate;
      });

      const exitParticipant = Effect.fnUntraced(function* (
        aggregate: ReadyRoomAggregate,
        participantId: string,
      ) {
        const participants = { ...aggregate.participants };
        delete participants[participantId];
        return yield* repository.exitParticipant(
          aggregate,
          {
            ...aggregate,
            revision: aggregate.revision + 1,
            updatedAt: new Date(clock()).toISOString(),
            participants,
          },
          participantId,
        );
      });

      const offlineRoom = (
        notificationId: string,
        event: typeof GameCharacterOffline.Type,
        attempt = 0,
      ): Effect.Effect<void, unknown> =>
        Effect.gen(function* () {
          const aggregate = yield* repository.get(notificationId);
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
            yield* cancelAggregate(aggregate);
            return;
          }
          const participant = Object.values(aggregate.participants).find(
            (entry) =>
              entry.discordId === event.discordId &&
              entry.character.characterId === event.characterId &&
              Date.parse(entry.createdAt) <= event.disconnectedAt,
          );
          if (!participant) return;
          const recipients = yield* preparePublication(
            aggregate,
            getReadyRoomActiveRecipientDiscordIds(aggregate),
          );
          const result = yield* exitParticipant(
            aggregate,
            participant.participantId,
          );
          if (result.status === "conflict")
            return yield* Effect.fail(
              new ResourceConflictError({ code: "REVISION_CONFLICT" }),
            );
          if (result.status === "committed")
            yield* publish(result.aggregate, recipients);
        }).pipe(
          Effect.catch((error) => {
            if (
              error instanceof ResourceConflictError &&
              attempt + 1 < MAX_CAS_ATTEMPTS
            )
              return offlineRoom(notificationId, event, attempt + 1);
            return Effect.fail(error);
          }),
        );

      return ReadyRoomData.of({
        characterOffline: (event) =>
          operation(
            repository
              .findForUser(event.discordId)
              .pipe(
                Effect.flatMap((rooms) =>
                  Effect.forEach(
                    rooms,
                    (room) => offlineRoom(room.notificationId, event),
                    { discard: true },
                  ),
                ),
              ),
          ),
        accessibleGuildIds: (discordId, includeReadable) =>
          operation(accessibleGuildIds(discordId, includeReadable)),
        create: (identity, guildIds, payload) =>
          operation(
            Effect.gen(function* () {
              const now = clock();
              const timestamp = new Date(now).toISOString();
              const aggregate: ReadyRoomAggregate = {
                schemaVersion: 3,
                notificationId: idGenerator(),
                organizerDiscordId: identity.discordId,
                organizerCharacter: structuredClone(payload.character),
                guildIds: [...guildIds],
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
              if (payload.minLvl !== undefined)
                aggregate.minLvl = payload.minLvl;
              if (payload.maxLvl !== undefined)
                aggregate.maxLvl = payload.maxLvl;
              const recipients = yield* preparePublication(aggregate, [
                identity.discordId,
              ]);
              const result = yield* repository.create(aggregate);
              if (result.status === "active-room-exists") {
                return yield* Effect.fail(
                  new ResourceConflictError({
                    code: "ACTIVE_GATHERING_EXISTS",
                    notificationId: result.notificationId,
                  }),
                );
              }
              if (result.status === "joined-elsewhere") {
                return yield* Effect.fail(
                  new ResourceConflictError({
                    code: "ALREADY_JOINED_ELSEWHERE",
                    notificationId: result.notificationId,
                  }),
                );
              }
              if (result.status === "room-exists") {
                return yield* Effect.fail(
                  new ResourceConflictError({ code: "REVISION_CONFLICT" }),
                );
              }
              yield* publish(result.aggregate, recipients);
              yield* Effect.forEach(
                guildIds,
                (guildId) =>
                  effects
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
                    .pipe(Effect.ignore),
                { discard: true },
              );
              return createReadyRoomProjection(
                result.aggregate,
                identity.discordId,
              );
            }).pipe(
              Effect.withSpan("PartyReadyRoomControllerCreate.redis", {
                attributes: { adapter: "ReadyRoomRedis", retryCount: 0 },
              }),
            ),
          ),
        active: (identity, guildIds, world) =>
          operation(
            Effect.gen(function* () {
              const visibleGuilds = yield* readyRoomSourceVisibility(
                database,
                identity.discordId,
                guildIds,
              );
              const rooms = yield* repository.findActive(guildIds, world);
              return rooms
                .flatMap((room) => {
                  const visible = visibleGuilds(room);
                  if (visible.length === 0) return [];
                  const applicants = Object.values(room.participants).filter(
                    ({ character }) =>
                      character.accountId !==
                        room.organizerCharacter.accountId ||
                      character.characterId !==
                        room.organizerCharacter.characterId,
                  );
                  return [
                    {
                      notificationId: room.notificationId,
                      organizerName: room.organizerCharacter.nick,
                      organizerDiscordId: room.organizerDiscordId,
                      organizerLvl: room.organizerCharacter.lvl,
                      organizerProf: room.organizerCharacter.prof,
                      applicantCount: applicants.length,
                      ...(room.partyMemberCount !== undefined && {
                        partyMemberCount: room.partyMemberCount,
                      }),
                      inPartyCount: applicants.filter(
                        ({ partyPresence }) => partyPresence === "IN_PARTY",
                      ).length,
                      guildIds: visible,
                      world: room.world,
                      ...(room.description !== undefined && {
                        description: room.description,
                      }),
                      ...(room.minLvl !== undefined && { minLvl: room.minLvl }),
                      ...(room.maxLvl !== undefined && { maxLvl: room.maxLvl }),
                      ...(room.npc && {
                        npc: {
                          ...(room.npc.icon !== undefined && {
                            icon: room.npc.icon,
                          }),
                          ...(room.npc.type !== undefined && {
                            type: room.npc.type,
                          }),
                          ...(room.npc.prof !== undefined && {
                            prof: room.npc.prof,
                          }),
                          name: room.npc.name,
                          location: room.npc.location,
                          lvl: room.npc.lvl,
                          ...(room.npc.x !== undefined && { x: room.npc.x }),
                          ...(room.npc.y !== undefined && { y: room.npc.y }),
                        },
                      }),
                      createdAt: room.createdAt,
                      expiresAt: room.expiresAt,
                    },
                  ];
                })
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            }),
          ),
        list: (identity, guildIds) =>
          operation(
            Effect.gen(function* () {
              const apiKey = yield* requestApiKeyAccess;
              const visibleSources = yield* readyRoomSourceVisibility(
                database,
                identity.discordId,
                guildIds,
              );
              return yield* repository.findForUser(identity.discordId).pipe(
                Effect.map((aggregates) =>
                  [
                    ...new Map(
                      aggregates.map((item) => [item.notificationId, item]),
                    ).values(),
                  ].flatMap((aggregate) => {
                    const live =
                      aggregate.status === "ACTIVE" &&
                      Date.parse(aggregate.expiresAt) > clock();
                    const sharesGuild = guildIds.some((id) =>
                      aggregate.guildIds.includes(id),
                    );
                    if (!live || !sharesGuild) return [];
                    if (aggregate.npc && visibleSources(aggregate).length === 0)
                      return [];
                    if (
                      apiKey &&
                      !aggregate.guildIds.every((id) => guildIds.includes(id))
                    )
                      return [];
                    const projection = createReadyRoomProjection(
                      aggregate,
                      identity.discordId,
                      aggregate.npc ? visibleSources(aggregate) : guildIds,
                    );
                    return projection ? [projection] : [];
                  }),
                ),
              );
            }),
          ),
        get: (identity, notificationId, guildIds) =>
          operation(
            getLive(notificationId).pipe(
              Effect.flatMap((aggregate) =>
                Effect.gen(function* () {
                  const visibleSources = yield* readyRoomSourceVisibility(
                    database,
                    identity.discordId,
                    guildIds,
                  );
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
                    : Effect.fail(
                        new PermissionDeniedError({ code: "FORBIDDEN" }),
                      );
                }),
              ),
            ),
          ),
        apply: (identity, notificationId, guildIds, payload) =>
          operation(
            joinWithRetry(
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
              identity.discordId,
              notificationId,
              payload.participantId,
              0,
            ),
          ),
        remove: (identity, notificationId, payload) =>
          operation(
            Effect.gen(function* () {
              const aggregate = yield* getLive(notificationId);
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
              const recipients = yield* preparePublication(
                aggregate,
                getReadyRoomActiveRecipientDiscordIds(aggregate),
              );
              const viewerGuildIds = yield* projectionGuildIds(
                aggregate,
                identity.discordId,
              );
              const result = yield* exitParticipant(
                aggregate,
                payload.participantId,
              ).pipe(Effect.flatMap(assertCommitted));
              yield* publish(result.aggregate, recipients);
              return createReadyRoomClientUpdate(
                result.aggregate,
                identity.discordId,
                viewerGuildIds,
              );
            }),
          ),
        resolveInvitationTargets: (identity, notificationId, payload) =>
          operation(
            Effect.gen(function* () {
              const aggregate = yield* getLive(notificationId);
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
            }),
          ),
        observeParty: (identity, notificationId, payload) =>
          operation(
            observeWithRetry(
              identity.discordId,
              notificationId,
              payload.organizerAccountId,
              payload.organizerCharacterId,
              payload.memberCharacterIds,
              0,
            ),
          ),
        cancel: (identity, notificationId, payload) =>
          operation(
            Effect.gen(function* () {
              const aggregate = yield* getLive(notificationId);
              yield* assertOrganizer(
                aggregate,
                identity.discordId,
                payload.expectedRevision,
              );
              const viewerGuildIds = yield* projectionGuildIds(
                aggregate,
                identity.discordId,
              );
              const cancelled = yield* cancelAggregate(aggregate);
              return createReadyRoomClientUpdate(
                cancelled,
                identity.discordId,
                viewerGuildIds,
              );
            }).pipe(
              Effect.withSpan("PartyReadyRoomControllerCancel.redis", {
                attributes: { adapter: "ReadyRoomRedis", retryCount: 0 },
              }),
            ),
          ),
      });
    }),
  );
