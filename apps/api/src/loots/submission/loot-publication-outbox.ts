import type { CanonicalRabbitEvent } from "@lootlog/protocol/rabbit/events";
import { eventMessage, type RabbitMessaging } from "@lootlog/messaging";
import { readPublishedFeedEntry } from "#src/users/user-feed";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { Clock, Effect, Metric, Schema } from "effect";
import { GuildLootCreatedEventV2Schema } from "@lootlog/schema/loot-events";
import type { GuildLootCreatedMessageV2 } from "@lootlog/protocol/loot-events";
import type { LootSnapshot } from "@lootlog/protocol/loot-summary";
import type { LootQueryOperations } from "#src/loots/query/loot-query.operations";
import { LootResponse } from "#src/loots/loot-response.schema";
import { encodeUnknownResponse } from "#src/shared/schema/encode-response";
import { LootCreatedNotificationEventV2Schema } from "@lootlog/schema/notifications";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { organizationLootRecordTable } from "#src/database/drizzle/loot.schema";
import { lootPublicationOutboxTable } from "#src/database/drizzle/loot-publication-outbox.schema";
import { makeOutboxDispatcher } from "#src/shared/outbox-worker";

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
      RabbitRoutingKey.CATALOG_NPCS_INDEX,
      RabbitRoutingKey.CATALOG_ITEMS_INDEX,
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

const lootPublicationAge = Metric.histogram("loot.publication.age_ms", {
  description:
    "Age of a committed loot.created intent at successful publication",
  boundaries: [100, 1000, 5000, 30_000, 60_000, 300_000, 900_000],
});

/** Encodes a loot for `loot.created` exactly as its Organization's HTTP responses do. */
export const makeLootSnapshotReader =
  (query: Pick<LootQueryOperations, "fetchOrganizationLoot">) =>
  (guildId: string, lootId: number) =>
    query
      .fetchOrganizationLoot(guildId, lootId)
      .pipe(
        Effect.map((loot) =>
          loot ? encodeUnknownResponse(LootResponse, loot) : null,
        ),
      );

/** One locked intent per transaction; failed deliveries remain durable for the next poll. */
export const makeLootPublicationDispatcher = (
  database: typeof ApiDatabase.Service,
  rabbit: Pick<typeof RabbitMessaging.Service, "publish">,
  invalidateCaches: (organizationIds: string[]) => Effect.Effect<void, unknown>,
  readLoot: (
    guildId: string,
    lootId: number,
  ) => Effect.Effect<LootSnapshot | null, unknown>,
) =>
  // ponytail: one delivery holds one DB transaction; use leased batches if measured throughput requires it.
  makeOutboxDispatcher(
    "LootPublicationOutbox",
    database,
    lootPublicationOutboxTable,
    (row, transaction) =>
      Effect.gen(function* () {
        const payload = yield* Schema.decodeUnknownEffect(
          LootPublicationPayload,
        )(row.payload);

        const records = yield* transaction
          .select({ guildId: organizationLootRecordTable.guildId })
          .from(organizationLootRecordTable)
          .where(
            and(
              eq(organizationLootRecordTable.lootId, row.lootId),
              inArray(organizationLootRecordTable.guildId, row.organizationIds),
              isNull(organizationLootRecordTable.archivedAt),
            ),
          );

        const organizationIds = records.map(({ guildId }) => guildId);

        if (organizationIds.length > 0) {
          if (payload.kind === "cache") {
            yield* invalidateCaches(organizationIds);
          } else {
            let data =
              payload.routingKey === RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED
                ? { ...payload.data, guildIds: organizationIds }
                : payload.data;

            if (payload.routingKey === RabbitRoutingKey.GUILDS_LOOTS_CREATE) {
              const feedEntry = yield* readPublishedFeedEntry(
                transaction,
                payload.data.guildId,
                { lootId: payload.data.lootId },
              );

              // Without a snapshot, web clients read the loot back instead.
              const loot = yield* readLoot(
                payload.data.guildId,
                payload.data.lootId,
              ).pipe(
                Effect.catch((error) =>
                  Effect.logWarning(
                    "Loot publication continues without a snapshot",
                  ).pipe(
                    Effect.annotateLogs({ publicationId: row.id, error }),
                    Effect.as(null),
                  ),
                ),
              );

              data = {
                ...payload.data,
                ...(feedEntry && { feedEntry }),
                ...(loot && { loot }),
              } satisfies GuildLootCreatedMessageV2;
            }

            const publication = rabbit.publish(
              eventMessage(
                payload.routingKey,
                // SAFETY: `createdPublications` typed the data by this routing
                // key before it was stored, and consumers validate it again.
                data as CanonicalRabbitEvent<typeof payload.routingKey>,
                { messageId: `loot-publication:${row.id}` },
              ),
            );

            if (payload.routingKey === RabbitRoutingKey.GUILDS_LOOTS_CREATE) {
              const ageMs = Math.max(
                0,
                (yield* Clock.currentTimeMillis) - row.createdAt.getTime(),
              );

              yield* publication.pipe(
                Effect.withSpan("loots.publishCreated", {
                  attributes: {
                    "organization.id": payload.data.guildId,
                    "loot.id": row.lootId,
                    "messaging.message.id": `loot-publication:${row.id}`,
                    "loot.publication.age_ms": ageMs,
                  },
                }),
              );
              yield* Metric.update(lootPublicationAge, ageMs);
            } else {
              yield* publication;
            }
          }
        }
      }),
  );
