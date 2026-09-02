import { randomUUID } from "node:crypto";

import { and, arrayOverlaps, eq, isNotNull, or } from "drizzle-orm";
import { Effect, Layer } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import type {
  PartyReadyRoomCharacter,
  PartyReadyRoomParticipant,
  PartyReadyRoomUpdateEnvelope,
} from "@lootlog/schema/party-ready-room";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";
import {
  createReadyRoomClientUpdate,
  createReadyRoomProjection,
  getReadyRoomActiveRecipientDiscordIds,
} from "#src/messaging/ready-room/ready-room-projection";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from "#src/shared/http/http-errors";
import {
  ReadyRoomData,
  ReadyRoomOperationError,
} from "./party-ready-room.handlers.js";
import {
  makeReadyRoomRepository,
  type ReadyRoomRedis,
} from "./ready-room.repository.js";

const ROOM_LIFETIME_MS = 30 * 60 * 1000;
const MAX_CAS_ATTEMPTS = 4;
const readyRoomPermissions = [
  Permission.LOOTLOG_NOTIFICATIONS_SEND,
  Permission.OWNER,
  Permission.ADMIN,
  Permission.LOOTLOG_MANAGE,
] as const;

export interface ReadyRoomEffects {
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
  return makeReadyRoomRepository(redis, clock)
    .create(aggregate)
    .pipe(
      Effect.flatMap((result) => {
        if (result.status === "active-room-exists") {
          return Effect.fail(
            new ConflictException({
              code: "ACTIVE_GATHERING_EXISTS",
              notificationId: result.notificationId,
            }),
          );
        }
        if (result.status === "joined-elsewhere") {
          return Effect.fail(
            new ConflictException({
              code: "ALREADY_JOINED_ELSEWHERE",
              notificationId: result.notificationId,
            }),
          );
        }
        if (result.status === "room-exists") {
          return Effect.fail(
            new ConflictException({ code: "REVISION_CONFLICT" }),
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
      const publish = (
        aggregate: ReadyRoomAggregate,
        recipients: ReadonlyArray<string>,
      ) =>
        Effect.forEach(
          [...new Set(recipients)],
          (recipientDiscordId) =>
            effects
              .publish({
                recipientDiscordId,
                eligibleGuildIds: [...aggregate.guildIds],
                update: createReadyRoomClientUpdate(
                  aggregate,
                  recipientDiscordId,
                ),
              })
              .pipe(Effect.ignore),
          { discard: true },
        );
      const getLive = (notificationId: string) =>
        repository.get(notificationId).pipe(
          Effect.flatMap((aggregate) => {
            if (!aggregate || Date.parse(aggregate.expiresAt) <= clock()) {
              return Effect.fail(
                new NotFoundException({ code: "ROOM_EXPIRED" }),
              );
            }
            return aggregate.status === "ACTIVE"
              ? Effect.succeed(aggregate)
              : Effect.fail(
                  new UnprocessableEntityException({
                    code: "INVALID_STATE_TRANSITION",
                  }),
                );
          }),
        );
      const assertOrganizer = (
        aggregate: ReadyRoomAggregate,
        discordId: string,
        revision: number,
      ) => {
        if (aggregate.organizerDiscordId !== discordId) {
          return Effect.fail(new ForbiddenException({ code: "FORBIDDEN" }));
        }
        return aggregate.revision === revision
          ? Effect.void
          : Effect.fail(new ConflictException({ code: "REVISION_CONFLICT" }));
      };
      const assertCommitted = <A extends { readonly status: string }>(
        result: A,
      ) => {
        if (result.status === "missing") {
          return Effect.fail(new NotFoundException({ code: "ROOM_EXPIRED" }));
        }
        if (result.status === "conflict") {
          return Effect.fail(
            new ConflictException({ code: "REVISION_CONFLICT" }),
          );
        }
        return Effect.succeed(result as A & { readonly status: "committed" });
      };

      const accessibleGuildIds = (discordId: string) =>
        database
          .selectDistinct({ id: guildTable.id })
          .from(guildTable)
          .leftJoin(
            memberTable,
            and(
              eq(memberTable.guildId, guildTable.id),
              eq(memberTable.userId, discordId),
              eq(memberTable.active, true),
              isNotNull(memberTable.globalUserId),
            ),
          )
          .leftJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
          .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
          .where(
            and(
              eq(guildTable.active, true),
              or(
                eq(guildTable.ownerId, discordId),
                arrayOverlaps(roleTable.permissions, [...readyRoomPermissions]),
              ),
            ),
          )
          .pipe(Effect.map((guilds) => guilds.map(({ id }) => id)));

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
              new ConflictException({ code: "CHARACTER_ALREADY_JOINED" }),
            );
          }
          const sharesGuild = guildIds.some((id) =>
            aggregate.guildIds.includes(id),
          );
          const meetsLevel =
            (aggregate.minLvl === undefined ||
              character.lvl >= aggregate.minLvl) &&
            (aggregate.maxLvl === undefined ||
              character.lvl <= aggregate.maxLvl);
          if (!sharesGuild || world !== aggregate.world || !meetsLevel) {
            return yield* Effect.fail(
              new ForbiddenException({ code: "INELIGIBLE_CHARACTER" }),
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
                new ConflictException({ code: "CHARACTER_ALREADY_JOINED" }),
              );
            }
            return createReadyRoomProjection(aggregate, discordId);
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
          const result = yield* repository.join(aggregate, next, participantId);
          if (result.status === "joined-elsewhere") {
            return yield* Effect.fail(
              new ConflictException({
                code: "ALREADY_JOINED_ELSEWHERE",
                notificationId: result.notificationId,
              }),
            );
          }
          if (result.status === "missing") {
            return yield* Effect.fail(
              new NotFoundException({ code: "ROOM_EXPIRED" }),
            );
          }
          if (result.status === "conflict") {
            return attempt + 1 >= MAX_CAS_ATTEMPTS
              ? yield* Effect.fail(
                  new ConflictException({ code: "REVISION_CONFLICT" }),
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
          yield* publish(result.aggregate, [
            result.aggregate.organizerDiscordId,
            discordId,
          ]);
          return createReadyRoomProjection(result.aggregate, discordId);
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
              new ForbiddenException({ code: "FORBIDDEN" }),
            );
          }
          const recipients = getReadyRoomActiveRecipientDiscordIds(aggregate);
          const participants = { ...aggregate.participants };
          delete participants[participantId];
          const next: ReadyRoomAggregate = {
            ...aggregate,
            revision: aggregate.revision + 1,
            updatedAt: new Date(clock()).toISOString(),
            participants,
          };
          const result = yield* repository.exitParticipant(
            aggregate,
            next,
            participantId,
          );
          if (result.status === "missing") {
            return yield* Effect.fail(
              new NotFoundException({ code: "ROOM_EXPIRED" }),
            );
          }
          if (result.status === "conflict") {
            return attempt + 1 >= MAX_CAS_ATTEMPTS
              ? yield* Effect.fail(
                  new ConflictException({ code: "REVISION_CONFLICT" }),
                )
              : yield* withdrawWithRetry(
                  discordId,
                  notificationId,
                  participantId,
                  attempt + 1,
                );
          }
          yield* publish(result.aggregate, recipients);
          return createReadyRoomClientUpdate(result.aggregate, discordId);
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
              new ForbiddenException({ code: "FORBIDDEN" }),
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
          if (changed.length === 0) {
            return createReadyRoomProjection(aggregate, discordId);
          }
          const next: ReadyRoomAggregate = {
            ...aggregate,
            revision: aggregate.revision + 1,
            updatedAt,
            participants,
          };
          const result = yield* repository.commit(aggregate, next);
          if (result.status === "missing") {
            return yield* Effect.fail(
              new NotFoundException({ code: "ROOM_EXPIRED" }),
            );
          }
          if (result.status === "conflict") {
            return attempt + 1 >= MAX_CAS_ATTEMPTS
              ? yield* Effect.fail(
                  new ConflictException({ code: "REVISION_CONFLICT" }),
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
          yield* publish(result.aggregate, [discordId, ...changed]);
          return createReadyRoomProjection(result.aggregate, discordId);
        });

      return ReadyRoomData.of({
        accessibleGuildIds: (discordId) =>
          operation(accessibleGuildIds(discordId)),
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
                ...(payload.description === undefined
                  ? {}
                  : { description: payload.description }),
                ...(payload.minLvl === undefined
                  ? {}
                  : { minLvl: payload.minLvl }),
                ...(payload.maxLvl === undefined
                  ? {}
                  : { maxLvl: payload.maxLvl }),
                status: "ACTIVE",
                revision: 1,
                createdAt: timestamp,
                updatedAt: timestamp,
                expiresAt: new Date(now + ROOM_LIFETIME_MS).toISOString(),
                participants: {},
              };
              const result = yield* repository.create(aggregate);
              if (result.status === "active-room-exists") {
                return yield* Effect.fail(
                  new ConflictException({
                    code: "ACTIVE_GATHERING_EXISTS",
                    notificationId: result.notificationId,
                  }),
                );
              }
              if (result.status === "joined-elsewhere") {
                return yield* Effect.fail(
                  new ConflictException({
                    code: "ALREADY_JOINED_ELSEWHERE",
                    notificationId: result.notificationId,
                  }),
                );
              }
              if (result.status === "room-exists") {
                return yield* Effect.fail(
                  new ConflictException({ code: "REVISION_CONFLICT" }),
                );
              }
              yield* publish(result.aggregate, [identity.discordId]);
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
        list: (identity, guildIds) =>
          operation(
            repository.findForUser(identity.discordId).pipe(
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
                  const projection = createReadyRoomProjection(
                    aggregate,
                    identity.discordId,
                  );
                  return projection ? [projection] : [];
                }),
              ),
            ),
          ),
        get: (identity, notificationId, guildIds) =>
          operation(
            getLive(notificationId).pipe(
              Effect.flatMap((aggregate) => {
                const projection = createReadyRoomProjection(
                  aggregate,
                  identity.discordId,
                );
                const sharesGuild = guildIds.some((id) =>
                  aggregate.guildIds.includes(id),
                );
                return projection && sharesGuild
                  ? Effect.succeed(projection)
                  : Effect.fail(new ForbiddenException({ code: "FORBIDDEN" }));
              }),
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
                  new UnprocessableEntityException({
                    code: "INVALID_STATE_TRANSITION",
                  }),
                );
              }
              const recipients =
                getReadyRoomActiveRecipientDiscordIds(aggregate);
              const participants = { ...aggregate.participants };
              delete participants[payload.participantId];
              const next: ReadyRoomAggregate = {
                ...aggregate,
                revision: aggregate.revision + 1,
                updatedAt: new Date(clock()).toISOString(),
                participants,
              };
              const result = yield* repository
                .exitParticipant(aggregate, next, payload.participantId)
                .pipe(Effect.flatMap(assertCommitted));
              yield* publish(result.aggregate, recipients);
              return createReadyRoomClientUpdate(
                result.aggregate,
                identity.discordId,
              );
            }),
          ),
        resolveInvitationTargets: (identity, notificationId, payload) =>
          operation(
            Effect.gen(function* () {
              const aggregate = yield* getLive(notificationId);
              if (aggregate.organizerDiscordId !== identity.discordId) {
                return yield* Effect.fail(
                  new ForbiddenException({ code: "FORBIDDEN" }),
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
              const recipients =
                getReadyRoomActiveRecipientDiscordIds(aggregate);
              const next: ReadyRoomAggregate = {
                ...aggregate,
                status: "CANCELLED",
                revision: aggregate.revision + 1,
                updatedAt: new Date(clock()).toISOString(),
              };
              const result = yield* repository
                .terminate(aggregate, next)
                .pipe(Effect.flatMap(assertCommitted));
              yield* effects.endPartyGatheringMessages(
                result.aggregate.notificationId,
                result.aggregate.guildIds,
              );
              yield* publish(result.aggregate, recipients);
              return createReadyRoomClientUpdate(
                result.aggregate,
                identity.discordId,
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
