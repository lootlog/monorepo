import { and, asc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import { GuildLootCreatedEventV2Schema } from "@lootlog/schema/loot-events";
import { LootCreatedNotificationEventV2Schema } from "@lootlog/schema/notifications";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type { RabbitMessaging } from "@lootlog/messaging";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { organizationLootRecordTable } from "#src/database/drizzle/schema";
import { lootPublicationOutboxTable } from "#src/database/drizzle/loot-publication-outbox.schema";

const RabbitPublication = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("rabbit"),
    routingKey: Schema.Literal(RabbitRoutingKey.GUILDS_LOOTS_CREATE),
    data: GuildLootCreatedEventV2Schema,
  }),
  Schema.Struct({
    kind: Schema.Literal("rabbit"),
    routingKey: Schema.Literal(RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED),
    data: LootCreatedNotificationEventV2Schema,
  }),
  Schema.Struct({
    kind: Schema.Literal("rabbit"),
    routingKey: Schema.Literals([
      RabbitRoutingKey.SEARCH_PLAYERS_INDEX,
      RabbitRoutingKey.SEARCH_NPCS_INDEX,
      RabbitRoutingKey.SEARCH_ITEMS_INDEX,
    ]),
    data: Schema.Array(Schema.Unknown),
  }),
]);
const CachePublication = Schema.Struct({ kind: Schema.Literal("cache") });
export const LootPublicationPayload = Schema.Union([
  RabbitPublication,
  CachePublication,
]);
export type LootPublication = {
  readonly organizationIds: string[];
  readonly payload: typeof LootPublicationPayload.Type;
};

/** One locked intent per transaction; failed deliveries remain durable for the next poll. */
export const makeLootPublicationDispatcher = (
  database: typeof ApiDatabase.Service,
  rabbit: Pick<typeof RabbitMessaging.Service, "publish">,
  invalidateCaches: (organizationIds: string[]) => Effect.Effect<void, unknown>,
) => {
  // ponytail: one delivery holds one DB transaction; use leased batches if measured throughput requires it.
  const dispatchOne = (attempted: number[]) => {
    let selectedId: number | undefined;
    return database
      .transaction((transaction) =>
        Effect.gen(function* () {
          const [row] = yield* transaction
            .select()
            .from(lootPublicationOutboxTable)
            .where(
              attempted.length > 0
                ? notInArray(lootPublicationOutboxTable.id, attempted)
                : undefined,
            )
            .orderBy(
              sql`${lootPublicationOutboxTable.lastAttemptAt} ASC NULLS FIRST`,
              asc(lootPublicationOutboxTable.id),
            )
            .limit(1)
            .for("update", { skipLocked: true });
          if (!row) return undefined;
          selectedId = row.id;
          const payload = yield* Schema.decodeUnknownEffect(
            LootPublicationPayload,
          )(row.payload);
          const records = yield* transaction
            .select({ guildId: organizationLootRecordTable.guildId })
            .from(organizationLootRecordTable)
            .where(
              and(
                eq(organizationLootRecordTable.lootId, row.lootId),
                inArray(
                  organizationLootRecordTable.guildId,
                  row.organizationIds,
                ),
                isNull(organizationLootRecordTable.archivedAt),
              ),
            );
          const organizationIds = records.map(({ guildId }) => guildId);
          if (organizationIds.length > 0) {
            if (payload.kind === "cache") {
              yield* invalidateCaches(organizationIds);
            } else {
              const data =
                payload.routingKey ===
                RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED
                  ? { ...payload.data, guildIds: organizationIds }
                  : payload.data;
              yield* rabbit.publish({
                exchange: "default",
                routingKey: payload.routingKey,
                messageId: `loot-publication:${row.id}`,
                content: new TextEncoder().encode(JSON.stringify(data)),
              });
            }
          }
          yield* transaction
            .delete(lootPublicationOutboxTable)
            .where(eq(lootPublicationOutboxTable.id, row.id));
          return row.id;
        }).pipe(Effect.timeout("10 seconds")),
      )
      .pipe(
        Effect.catch((error) =>
          selectedId === undefined
            ? Effect.fail(error)
            : Effect.gen(function* () {
                const publicationId = selectedId;
                if (publicationId === undefined) return undefined;
                yield* database
                  .update(lootPublicationOutboxTable)
                  .set({
                    lastAttemptAt: new Date(yield* Clock.currentTimeMillis),
                  })
                  .where(eq(lootPublicationOutboxTable.id, publicationId));
                yield* Effect.logError(
                  "Loot publication remains pending after delivery failure",
                ).pipe(Effect.annotateLogs({ publicationId }));
                return publicationId;
              }),
        ),
      );
  };

  return Effect.fn("LootPublicationOutbox.dispatch")(function* () {
    const attempted: number[] = [];
    for (let processed = 0; processed < 100; processed++) {
      const id = yield* dispatchOne(attempted);
      if (id === undefined) break;
      attempted.push(id);
    }
  });
};
