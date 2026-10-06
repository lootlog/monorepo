import { v6 } from "uuid";
import { and, asc, desc, eq, gt, isNull, or } from "drizzle-orm";
import { Effect, Exit, Layer, Option, Schema } from "effect";
import {
  GLOBAL_CHAT_PAGE_SIZE,
  GlobalChatMessageSchema,
  type GlobalChatChannelUpdate,
  type GlobalChatMessage,
} from "@lootlog/schema/chat";
import type {
  GlobalChatMessageResponse,
  GlobalChatMuteResponse,
} from "#src/contracts/global-chat/schemas";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  globalChatMuteTable,
  guildTable,
  memberTable,
  timerTable,
} from "#src/database/drizzle/schema";
import { activeGuildMemberJoin } from "#src/members/member-access-query";
import {
  GlobalChatAccessDenied,
  GlobalChatData,
  GlobalChatNotFound,
  GlobalChatOperationError,
  GlobalChatRateLimited,
  type GlobalChatCaller,
} from "./global-chat.handlers.js";

/** A kept message with its position in the channel; higher positions are newer. */
export type GlobalChatStoredEntry = {
  readonly position: number;
  readonly value: string;
};

/** Every `world` argument is undefined for the channel every world shares. */
export interface GlobalChatStore {
  /** Appends one message and trims the channel to its retention limit. */
  readonly append: (
    world: string | undefined,
    value: string,
  ) => Effect.Effect<void, unknown>;
  /** Up to `count` messages older than `before`, newest first. */
  readonly page: (
    world: string | undefined,
    before: number | undefined,
    count: number,
  ) => Effect.Effect<ReadonlyArray<GlobalChatStoredEntry>, unknown>;
  /** The kept message with this id, if the channel still keeps it. */
  readonly find: (
    world: string | undefined,
    id: string,
  ) => Effect.Effect<string | undefined, unknown>;
  /** False when the channel no longer keeps the message. */
  readonly remove: (
    world: string | undefined,
    id: string,
  ) => Effect.Effect<boolean, unknown>;
  readonly getPinned: (
    world: string | undefined,
  ) => Effect.Effect<string | undefined, unknown>;
  /** Replaces the pinned message; undefined unpins it. */
  readonly setPinned: (
    world: string | undefined,
    value: string | undefined,
  ) => Effect.Effect<void, unknown>;
  /** False while the User's previous message is still within the cooldown. */
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

/**
 * The world list comes from timers, since Margonem refuses requests from the
 * API's addresses. A world appears once any Organization records a timer
 * there; the hour of caching keeps the scan off the send path.
 */
const KNOWN_WORLDS_TTL = "1 hour";

/**
 * The sender stays in storage only to mark the caller's own messages, to show
 * admins, and to let an admin mute the author of a kept message.
 */
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
  adminUserIds: ReadonlyArray<string>,
) =>
  Effect.gen(function* () {
    const database = yield* ApiDatabase;
    const admins = new Set(adminUserIds);

    const storeCall = <A>(effect: Effect.Effect<A, unknown>) =>
      effect.pipe(Effect.mapError(operationError));

    /**
     * Any active membership admits the caller. The Discord display name is
     * the same on every membership; one that member sync has not refreshed
     * yet falls back to the server nickname.
     */
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
        Effect.map((rows) => rows.map(({ world }) => world)),
        Effect.mapError(operationError),
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
          Effect.map(([mute]) => mute),
          Effect.mapError(operationError),
        );

    /** The message as every reader sees it; admin status follows the current list. */
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

    /** A kept or pinned message; a pinned one can outlive the trimmed list. */
    const findMessage = (world: string | undefined, id: string) =>
      Effect.gen(function* () {
        const kept = parsed(yield* storeCall(store.find(world, id)));

        if (kept) return kept;
        const pinned = parsed(yield* storeCall(store.getPinned(world)));

        return pinned?.id === id ? pinned : yield* notFound();
      });

    const unpin = (world: string | undefined) =>
      Effect.gen(function* () {
        yield* storeCall(store.setPinned(world, undefined));
        // Readers see the stored state on their next fetch if the broadcast is lost.
        yield* events
          .publishChannelUpdate({
            type: "pinned",
            ...channelWorld(world),
            message: null,
          })
          .pipe(Effect.ignore);
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

          // One extra entry tells whether an older page exists.
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
          const displayName = yield* sender(caller);
          yield* requireChannel(payload.world);

          if (yield* activeMute(caller.userId)) return yield* accessDenied();

          const acquired = yield* storeCall(
            store.acquireSendSlot(caller.userId),
          );

          if (!acquired)
            return yield* Effect.fail(
              new GlobalChatRateLimited({ status: 429 }),
            );

          // Only the shared channel names where its senders write from.
          const originWorld =
            payload.world === undefined &&
            payload.originWorld !== undefined &&
            (yield* knownWorlds).includes(payload.originWorld)
              ? payload.originWorld
              : undefined;

          let stored: StoredGlobalChatMessage = {
            id: v6(),
            displayName,
            message: payload.message,
            timestamp: new Date().toISOString(),
            senderUserId: caller.userId,
          };

          if (payload.world !== undefined)
            stored = { ...stored, world: payload.world };
          else if (originWorld !== undefined)
            stored = { ...stored, originWorld };

          yield* storeCall(store.append(payload.world, encodeStored(stored)));

          // The message is stored; a lost broadcast reaches readers on their next fetch.
          yield* events.publish(published(stored)).pipe(Effect.ignore);

          return response(stored, caller);
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
              .pipe(Effect.ignore);
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
            .pipe(Effect.ignore);

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
            // PostgreSQL sorts nulls last in ascending order: lasting mutes go last.
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

          // Muting a muted sender again replaces the earlier mute.
          const [row] = yield* database
            .insert(globalChatMuteTable)
            .values({ id: v6(), userId: senderUserId, ...mute })
            .onConflictDoUpdate({
              target: globalChatMuteTable.userId,
              set: mute,
            })
            .returning()
            .pipe(Effect.mapError(operationError));

          if (!row)
            return yield* Effect.fail(
              operationError(new Error("Mute upsert returned no row")),
            );

          return muteResponse(row);
        }),
      unmuteSender: (caller, muteId) =>
        Effect.gen(function* () {
          yield* requireAdmin(caller);

          const deleted = yield* database
            .delete(globalChatMuteTable)
            .where(eq(globalChatMuteTable.id, muteId))
            .returning({ id: globalChatMuteTable.id })
            .pipe(Effect.mapError(operationError));

          if (deleted.length === 0) return yield* notFound();
        }),
    });
  });

export const makeGlobalChatDataLayer = (
  store: GlobalChatStore,
  events: GlobalChatEvents,
  adminUserIds: ReadonlyArray<string>,
) =>
  Layer.effect(
    GlobalChatData,
    makeGlobalChatOperations(store, events, adminUserIds),
  );
