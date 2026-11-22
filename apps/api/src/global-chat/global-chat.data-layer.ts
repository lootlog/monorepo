import type { RoleHolders } from "#src/platform-roles/role-holders";
import { ignorePublicationFailure } from "#src/shared/best-effort-publication";
import { and, asc, desc, eq, gt, isNull, or, type SQL } from "drizzle-orm";
import { Effect, Exit, Layer, Option, Schema } from "effect";
import {
  GLOBAL_CHAT_PAGE_SIZE,
  GLOBAL_CHAT_SEND_COOLDOWN_SECONDS,
  GlobalChatMessageSchema,
  type GlobalChatChannelUpdate,
  type GlobalChatMessage,
} from "@lootlog/schema/chat";
import type {
  GlobalChatMessageResponse,
  GlobalChatMuteResponse,
} from "#src/contracts/global-chat/schemas";
import { ApiDatabase } from "#src/database/drizzle/database";
import { globalChatMuteTable } from "#src/database/drizzle/global-chat.schema";
import {
  guildTable,
  memberTable,
} from "#src/database/drizzle/organization.schema";
import { timerTable } from "#src/database/drizzle/timer.schema";
import { activeGuildMemberJoin } from "#src/members/member-access-query";
import {
  GlobalChatAccessDenied,
  GlobalChatData,
  GlobalChatNotFound,
  GlobalChatOperationError,
  GlobalChatRateLimited,
  type GlobalChatCaller,
} from "./global-chat-data.js";

type GlobalChatStoredEntry = {
  readonly position: number;
  readonly value: string;
};

export interface GlobalChatStore {
  readonly append: (
    world: string | undefined,
    value: string,
  ) => Effect.Effect<void, unknown>;
  readonly page: (
    world: string | undefined,
    before: number | undefined,
    count: number,
  ) => Effect.Effect<ReadonlyArray<GlobalChatStoredEntry>, unknown>;
  readonly find: (
    world: string | undefined,
    id: string,
  ) => Effect.Effect<string | undefined, unknown>;
  readonly remove: (
    world: string | undefined,
    id: string,
  ) => Effect.Effect<boolean, unknown>;
  readonly getPinned: (
    world: string | undefined,
  ) => Effect.Effect<string | undefined, unknown>;
  readonly setPinned: (
    world: string | undefined,
    value: string | undefined,
  ) => Effect.Effect<void, unknown>;
  readonly acquireSendSlot: (userId: string) => Effect.Effect<boolean, unknown>;
}

export interface GlobalChatEvents {
  readonly publish: (
    message: GlobalChatMessage,
  ) => Effect.Effect<void, unknown>;
  readonly publishChannelUpdate: (
    update: GlobalChatChannelUpdate,
  ) => Effect.Effect<void, unknown>;
}

const KNOWN_WORLDS_TTL = "1 hour";

const StoredGlobalChatMessageJson = Schema.fromJsonString(
  Schema.Struct({
    ...GlobalChatMessageSchema.fields,
    senderUserId: Schema.String,
  }),
);

type StoredGlobalChatMessage = typeof StoredGlobalChatMessageJson.Type;

const parseStored = Schema.decodeUnknownOption(StoredGlobalChatMessageJson);

const encodeStored = Schema.encodeSync(StoredGlobalChatMessageJson);

const operationError = (cause: unknown) =>
  new GlobalChatOperationError({ cause });

const accessDenied = () =>
  Effect.fail(new GlobalChatAccessDenied({ status: 403 }));

const notFound = () => Effect.fail(new GlobalChatNotFound({ status: 404 }));

const muteResponse = (
  row: typeof globalChatMuteTable.$inferSelect,
): GlobalChatMuteResponse => ({
  id: row.id,
  displayName: row.displayName,
  mutedUntil: row.mutedUntil?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
});

const channelWorld = (world: string | undefined) =>
  world === undefined ? {} : { world };

export const makeGlobalChatOperations = (
  store: GlobalChatStore,
  events: GlobalChatEvents,
  admins: RoleHolders,
) =>
  Effect.gen(function* () {
    const database = yield* ApiDatabase;

    const storeCall = <A>(effect: Effect.Effect<A, unknown>) =>
      effect.pipe(Effect.mapError(operationError));

    const sender = ({ userId, discordId }: GlobalChatCaller) =>
      database
        .select({
          name: memberTable.name,
          discordDisplayName: memberTable.discordDisplayName,
        })
        .from(memberTable)
        .innerJoin(
          guildTable,
          and(activeGuildMemberJoin(discordId), eq(guildTable.active, true)),
        )
        .where(eq(memberTable.globalUserId, userId))
        .orderBy(
          asc(isNull(memberTable.discordDisplayName)),
          desc(memberTable.lastDiscordSyncAt),
        )
        .limit(1)
        .pipe(
          Effect.mapError(operationError),
          Effect.flatMap(([member]) =>
            member
              ? Effect.succeed(member.discordDisplayName ?? member.name)
              : accessDenied(),
          ),
        );

    const requireAdmin = (caller: GlobalChatCaller) =>
      admins.has(caller.userId) ? Effect.void : accessDenied();

    const knownWorlds = yield* database
      .selectDistinct({ world: timerTable.world })
      .from(timerTable)
      .orderBy(asc(timerTable.world))
      .pipe(
        Effect.mapBoth({
          onSuccess: (rows) => rows.map(({ world }) => world),
          onFailure: operationError,
        }),
        Effect.cachedWithTTL((exit) =>
          Exit.isSuccess(exit) ? KNOWN_WORLDS_TTL : 0,
        ),
      );

    const requireChannel = (world: string | undefined) =>
      world === undefined
        ? Effect.void
        : Effect.flatMap(knownWorlds, (worlds) =>
            worlds.includes(world) ? Effect.void : notFound(),
          );

    const activeMute = (userId: string) =>
      database
        .select({ mutedUntil: globalChatMuteTable.mutedUntil })
        .from(globalChatMuteTable)
        .where(
          and(
            eq(globalChatMuteTable.userId, userId),
            or(
              isNull(globalChatMuteTable.mutedUntil),
              gt(globalChatMuteTable.mutedUntil, new Date()),
            ),
          ),
        )
        .limit(1)
        .pipe(
          Effect.mapBoth({
            onSuccess: ([mute]) => mute,
            onFailure: operationError,
          }),
        );

    const published = ({
      senderUserId,
      isAdmin: _isAdmin,
      ...message
    }: StoredGlobalChatMessage): GlobalChatMessage => ({
      ...message,
      isAdmin: admins.has(senderUserId),
    });

    const response = (
      stored: StoredGlobalChatMessage,
      caller: GlobalChatCaller,
    ): GlobalChatMessageResponse => ({
      ...published(stored),
      isAdmin: admins.has(stored.senderUserId),
      isOwn: stored.senderUserId === caller.userId,
    });

    const parsed = (value: string | undefined) =>
      value === undefined
        ? undefined
        : Option.getOrUndefined(parseStored(value));

    const findMessage = (world: string | undefined, id: string) =>
      Effect.gen(function* () {
        const kept = parsed(yield* storeCall(store.find(world, id)));

        if (kept) return kept;
        const pinned = parsed(yield* storeCall(store.getPinned(world)));

        return pinned?.id === id ? pinned : yield* notFound();
      });

    const liftMute = (match: SQL) =>
      database
        .delete(globalChatMuteTable)
        .where(match)
        .returning({ id: globalChatMuteTable.id })
        .pipe(
          Effect.mapError(operationError),
          Effect.flatMap((deleted) =>
            deleted.length === 0 ? notFound() : Effect.void,
          ),
        );

    const unpin = (world: string | undefined) =>
      Effect.gen(function* () {
        yield* storeCall(store.setPinned(world, undefined));
        yield* events
          .publishChannelUpdate({
            type: "pinned",
            ...channelWorld(world),
            message: null,
          })
          .pipe(ignorePublicationFailure);
      });

    return GlobalChatData.of({
      getWorlds: (caller) =>
        Effect.gen(function* () {
          yield* sender(caller);

          return { worlds: yield* knownWorlds };
        }),
      getMessages: (caller, world, before) =>
        Effect.gen(function* () {
          yield* sender(caller);
          yield* requireChannel(world);

          const [entries, pinned, mute] = yield* Effect.all(
            [
              storeCall(store.page(world, before, GLOBAL_CHAT_PAGE_SIZE + 1)),
              storeCall(store.getPinned(world)),
              activeMute(caller.userId),
            ],
            { concurrency: "unbounded" },
          );

          const page = entries.slice(0, GLOBAL_CHAT_PAGE_SIZE);
          const oldest = page.at(-1);
          const pinnedMessage = parsed(pinned);

          return {
            messages: page.toReversed().flatMap((entry) => {
              const stored = parsed(entry.value);

              return stored ? [response(stored, caller)] : [];
            }),
            nextCursor:
              entries.length > GLOBAL_CHAT_PAGE_SIZE && oldest
                ? String(oldest.position)
                : null,
            pinned: pinnedMessage ? response(pinnedMessage, caller) : null,
            viewer: {
              isAdmin: admins.has(caller.userId),
              muted: mute !== undefined,
              mutedUntil: mute?.mutedUntil?.toISOString() ?? null,
            },
          };
        }),
      sendMessage: (caller, payload) =>
        Effect.gen(function* () {
          const [displayName, muted] = yield* Effect.all(
            [sender(caller), activeMute(caller.userId)],
            { concurrency: "unbounded" },
          );

          if (payload.allWorlds) yield* requireAdmin(caller);
          yield* requireChannel(payload.world);

          if (muted) return yield* accessDenied();

          const acquired = yield* storeCall(
            store.acquireSendSlot(caller.userId),
          );

          if (!acquired)
            return yield* new GlobalChatRateLimited({
              status: 429,
              retryAfterMs: GLOBAL_CHAT_SEND_COOLDOWN_SECONDS * 1000,
            });

          const worlds = yield* knownWorlds;

          const originWorld =
            payload.world === undefined &&
            !payload.allWorlds &&
            payload.originWorld !== undefined &&
            worlds.includes(payload.originWorld)
              ? payload.originWorld
              : undefined;

          const timestamp = new Date().toISOString();

          const compose = (
            world: string | undefined,
          ): StoredGlobalChatMessage => {
            const stored = {
              id: Bun.randomUUIDv7(),
              displayName,
              message: payload.message,
              timestamp,
              senderUserId: caller.userId,
            };

            if (world !== undefined) return { ...stored, world };

            return originWorld === undefined
              ? stored
              : { ...stored, originWorld };
          };

          const requested = compose(payload.world);

          const copies = payload.allWorlds
            ? [
                requested,
                ...[undefined, ...worlds].flatMap((world) =>
                  world === payload.world ? [] : [compose(world)],
                ),
              ]
            : [requested];

          yield* Effect.forEach(
            copies,
            (stored) =>
              Effect.gen(function* () {
                yield* storeCall(
                  store.append(stored.world, encodeStored(stored)),
                );

                yield* events
                  .publish(published(stored))
                  .pipe(ignorePublicationFailure);
              }),
            { concurrency: 8, discard: true },
          );

          return response(requested, caller);
        }),
      deleteMessage: (caller, world, messageId) =>
        Effect.gen(function* () {
          yield* requireAdmin(caller);
          yield* requireChannel(world);

          const removed = yield* storeCall(store.remove(world, messageId));
          const pinned = parsed(yield* storeCall(store.getPinned(world)));
          const wasPinned = pinned?.id === messageId;

          if (!removed && !wasPinned) return yield* notFound();

          if (wasPinned) yield* unpin(world);

          if (removed)
            yield* events
              .publishChannelUpdate({
                type: "deleted",
                ...channelWorld(world),
                id: messageId,
              })
              .pipe(ignorePublicationFailure);
        }),
      pinMessage: (caller, { world, messageId }) =>
        Effect.gen(function* () {
          yield* requireAdmin(caller);
          yield* requireChannel(world);
          const stored = yield* findMessage(world, messageId);

          yield* storeCall(store.setPinned(world, encodeStored(stored)));
          yield* events
            .publishChannelUpdate({
              type: "pinned",
              ...channelWorld(world),
              message: published(stored),
            })
            .pipe(ignorePublicationFailure);

          return response(stored, caller);
        }),
      unpinMessage: (caller, world) =>
        Effect.gen(function* () {
          yield* requireAdmin(caller);
          yield* requireChannel(world);
          yield* unpin(world);
        }),
      getMutes: (caller) =>
        Effect.gen(function* () {
          yield* requireAdmin(caller);

          const rows = yield* database
            .select()
            .from(globalChatMuteTable)
            .where(
              or(
                isNull(globalChatMuteTable.mutedUntil),
                gt(globalChatMuteTable.mutedUntil, new Date()),
              ),
            )
            .orderBy(
              asc(globalChatMuteTable.mutedUntil),
              asc(globalChatMuteTable.displayName),
            )
            .pipe(Effect.mapError(operationError));

          return { mutes: rows.map(muteResponse) };
        }),
      muteSender: (caller, { world, messageId, durationMinutes }) =>
        Effect.gen(function* () {
          yield* requireAdmin(caller);
          yield* requireChannel(world);

          const { senderUserId, displayName } = yield* findMessage(
            world,
            messageId,
          );

          const now = new Date();

          const mute = {
            displayName,
            mutedUntil:
              durationMinutes === null
                ? null
                : new Date(now.getTime() + durationMinutes * 60_000),
            mutedByUserId: caller.userId,
            createdAt: now,
          };

          const [row] = yield* database
            .insert(globalChatMuteTable)
            .values({ id: Bun.randomUUIDv7(), userId: senderUserId, ...mute })
            .onConflictDoUpdate({
              target: globalChatMuteTable.userId,
              set: mute,
            })
            .returning()
            .pipe(Effect.mapError(operationError));

          if (!row) return yield* Effect.die("Mute upsert returned no row");

          return muteResponse(row);
        }),
      unmuteSender: (caller, muteId) =>
        Effect.gen(function* () {
          yield* requireAdmin(caller);
          yield* liftMute(eq(globalChatMuteTable.id, muteId));
        }),
      unmuteMessageSender: (caller, world, messageId) =>
        Effect.gen(function* () {
          yield* requireAdmin(caller);
          yield* requireChannel(world);
          const { senderUserId } = yield* findMessage(world, messageId);

          yield* liftMute(eq(globalChatMuteTable.userId, senderUserId));
        }),
    });
  });

export const makeGlobalChatDataLayer = (
  store: GlobalChatStore,
  events: GlobalChatEvents,
  admins: RoleHolders,
) =>
  Layer.effect(GlobalChatData, makeGlobalChatOperations(store, events, admins));
