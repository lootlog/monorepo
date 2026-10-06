import { v6 } from "uuid";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { Effect, Layer, Option, Schema } from "effect";
import {
  GLOBAL_CHAT_PAGE_SIZE,
  GlobalChatMessageSchema,
  type GlobalChatMessage,
} from "@lootlog/schema/chat";
import { ApiDatabase } from "#src/database/drizzle/database";
import { guildTable, memberTable } from "#src/database/drizzle/schema";
import { activeGuildMemberJoin } from "#src/members/member-access-query";
import {
  GlobalChatAccessDenied,
  GlobalChatData,
  GlobalChatOperationError,
  GlobalChatRateLimited,
  type GlobalChatCaller,
} from "./global-chat.handlers.js";

/** A kept message with its position in the chat; higher positions are newer. */
export type GlobalChatStoredEntry = {
  readonly position: number;
  readonly value: string;
};

export interface GlobalChatStore {
  /** Appends one message and trims the chat to its retention limit. */
  readonly append: (value: string) => Effect.Effect<void, unknown>;
  /** Up to `count` messages older than `before`, newest first. */
  readonly page: (
    before: number | undefined,
    count: number,
  ) => Effect.Effect<ReadonlyArray<GlobalChatStoredEntry>, unknown>;
  /** False while the User's previous message is still within the cooldown. */
  readonly acquireSendSlot: (userId: string) => Effect.Effect<boolean, unknown>;
}

export interface GlobalChatEvents {
  readonly publish: (
    message: GlobalChatMessage,
  ) => Effect.Effect<void, unknown>;
}

/** The sender stays in storage only to mark the caller's own messages. */
const StoredGlobalChatMessageJson = Schema.fromJsonString(
  Schema.Struct({
    ...GlobalChatMessageSchema.fields,
    senderUserId: Schema.String,
  }),
);

const parseStored = Schema.decodeUnknownOption(StoredGlobalChatMessageJson);

const encodeStored = Schema.encodeSync(StoredGlobalChatMessageJson);

export const makeGlobalChatOperations = (
  store: GlobalChatStore,
  events: GlobalChatEvents,
) =>
  Effect.map(ApiDatabase, (database) => {
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
          Effect.mapError((cause) => new GlobalChatOperationError({ cause })),
          Effect.flatMap(([member]) =>
            member
              ? Effect.succeed(member.discordDisplayName ?? member.name)
              : Effect.fail(new GlobalChatAccessDenied({ status: 403 })),
          ),
        );

    const operationError = (cause: unknown) =>
      new GlobalChatOperationError({ cause });

    return GlobalChatData.of({
      getMessages: (caller, before) =>
        Effect.gen(function* () {
          yield* sender(caller);

          // One extra entry tells whether an older page exists.
          const entries = yield* store
            .page(before, GLOBAL_CHAT_PAGE_SIZE + 1)
            .pipe(Effect.mapError(operationError));

          const page = entries.slice(0, GLOBAL_CHAT_PAGE_SIZE);
          const oldest = page.at(-1);

          const messages = page.toReversed().flatMap((entry) => {
            const stored = parseStored(entry.value);

            if (Option.isNone(stored)) return [];
            const { senderUserId, ...message } = stored.value;

            return [{ ...message, isOwn: senderUserId === caller.userId }];
          });

          return {
            messages,
            nextCursor:
              entries.length > GLOBAL_CHAT_PAGE_SIZE && oldest
                ? String(oldest.position)
                : null,
          };
        }),
      sendMessage: (caller, payload) =>
        Effect.gen(function* () {
          const displayName = yield* sender(caller);

          const acquired = yield* store
            .acquireSendSlot(caller.userId)
            .pipe(Effect.mapError(operationError));

          if (!acquired)
            return yield* Effect.fail(
              new GlobalChatRateLimited({ status: 429 }),
            );

          const message: GlobalChatMessage = {
            id: v6(),
            displayName,
            message: payload.message,
            timestamp: new Date().toISOString(),
          };

          yield* store
            .append(encodeStored({ ...message, senderUserId: caller.userId }))
            .pipe(Effect.mapError(operationError));

          // The message is stored; a lost broadcast reaches readers on their next fetch.
          yield* events.publish(message).pipe(Effect.ignore);

          return { ...message, isOwn: true };
        }),
    });
  });

export const makeGlobalChatDataLayer = (
  store: GlobalChatStore,
  events: GlobalChatEvents,
) => Layer.effect(GlobalChatData, makeGlobalChatOperations(store, events));
