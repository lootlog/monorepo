import { RabbitMessaging } from "@lootlog/messaging";
import {
  RabbitExchange,
  RabbitRoutingKey,
  type RabbitQueueDefinition,
} from "@lootlog/protocol/rabbit/topology";
import { Context, Effect, Layer } from "effect";
import { Meilisearch } from "meilisearch";
import { AllService } from "#src/all/all.service";
import { parseSearchAllQuery } from "#src/all/dto/search-all.dto";
import { SearchConfig } from "#src/config/search-config";
import { parseGetItemsQuery } from "#src/items/dto/get-items.dto";
import { decodeIndexItemsPayload } from "#src/items/dto/index-items.dto";
import { ItemsService } from "#src/items/items.service";
import { MeilisearchIndexesService } from "#src/meilisearch/meilisearch-indexes.service";
import { parseGetNpcsQuery } from "#src/npcs/dto/get-npcs.dto";
import { decodeIndexNpcsPayload } from "#src/npcs/dto/index-npcs.dto";
import { NpcsService } from "#src/npcs/npcs.service";
import { parseGetPlayersQuery } from "#src/players/dto/get-players.dto";
import { decodeIndexPlayersPayload } from "#src/players/dto/index-players.dto";
import { PlayersService } from "#src/players/players.service";
import { consoleLogger } from "#src/shared/logger";

const queue = (
  name: string,
  routingKey: RabbitQueueDefinition["routingKey"],
): RabbitQueueDefinition => ({
  name,
  exchange: RabbitExchange.DEFAULT,
  routingKey,
  durable: true,
});
export const searchQueues = [
  queue("search.items.index", RabbitRoutingKey.SEARCH_ITEMS_INDEX),
  queue("search-npcs-index", RabbitRoutingKey.SEARCH_NPCS_INDEX),
  queue("search-players-index", RabbitRoutingKey.SEARCH_PLAYERS_INDEX),
] as const;

export interface SearchServicesValue {
  readonly all: AllService;
  readonly items: ItemsService;
  readonly npcs: NpcsService;
  readonly players: PlayersService;
}
export class SearchServices extends Context.Service<
  SearchServices,
  SearchServicesValue
>()("@lootlog/search/SearchServices") {
  static readonly layer = Layer.effect(
    SearchServices,
    Effect.gen(function* () {
      const config = yield* SearchConfig;
      const meilisearch = new Meilisearch({
        host: config.meilisearchHost,
        apiKey: config.meilisearchApiKey,
      });
      const items = new ItemsService(meilisearch, consoleLogger);
      const npcs = new NpcsService(meilisearch, consoleLogger);
      const players = new PlayersService(meilisearch, consoleLogger);
      yield* Effect.promise(() =>
        new MeilisearchIndexesService(
          meilisearch,
          consoleLogger,
        ).onApplicationBootstrap(),
      );
      return SearchServices.of({
        all: new AllService(items, players, npcs),
        items,
        npcs,
        players,
      });
    }),
  );
}

const json = (value: unknown, status = 200) => Response.json(value, { status });
export const makeSearchHandler =
  (services: SearchServicesValue) =>
  async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (request.method !== "GET") return json({ message: "Not Found" }, 404);
    if (url.pathname === "/healthz") return new Response("OK");
    if (url.pathname === "/items")
      return json(await services.items.searchItems(parseGetItemsQuery(url)));
    if (url.pathname === "/npcs")
      return json(await services.npcs.getNpcs(parseGetNpcsQuery(url)));
    if (url.pathname === "/players")
      return json(await services.players.getPlayers(parseGetPlayersQuery(url)));
    if (url.pathname === "/all")
      return json(await services.all.searchAll(parseSearchAllQuery(url)));
    if (url.pathname === "/doc")
      return new Response(
        Bun.file(new URL("../openapi.yaml", import.meta.url)),
      );
    return json({ message: "Not Found" }, 404);
  };

const decodeJson = (content: Uint8Array): unknown =>
  JSON.parse(new TextDecoder().decode(content));
export const SearchConsumers = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const services = yield* SearchServices;
    const consume = <A>(
      queueName: string,
      decode: (input: unknown) => ReadonlyArray<A>,
      index: (items: ReadonlyArray<A>) => Promise<unknown>,
    ) =>
      rabbit.consume(
        {
          queue: queueName,
          prefetch: 1,
          failurePolicy: { strategy: "requeue" },
        },
        (delivery) =>
          Effect.tryPromise({
            try: async () => {
              let items: ReadonlyArray<A>;
              try {
                items = decode(decodeJson(delivery.content));
              } catch (error) {
                consoleLogger.error(
                  `Validation error in ${queueName} handler`,
                  error,
                );
                return;
              }
              await index(items);
            },
            catch: (cause) => cause,
          }),
      );
    yield* consume("search.items.index", decodeIndexItemsPayload, (items) =>
      services.items.indexItems({ items }),
    );
    yield* consume("search-npcs-index", decodeIndexNpcsPayload, (npcs) =>
      services.npcs.indexNpcs({ npcs }),
    );
    yield* consume(
      "search-players-index",
      decodeIndexPlayersPayload,
      (players) => services.players.indexPlayers({ players }),
    );
  }),
);

export const SearchHttpServer = Layer.effectDiscard(
  Effect.gen(function* () {
    const config = yield* SearchConfig;
    const services = yield* SearchServices;
    yield* Effect.acquireRelease(
      Effect.sync(() =>
        Bun.serve({
          port: config.port,
          hostname: "0.0.0.0",
          fetch: makeSearchHandler(services),
        }),
      ),
      (server) => Effect.sync(() => server.stop(true)),
    );
    yield* Effect.logInfo(`Search listening on ${config.port}`);
  }),
);

const RabbitLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* SearchConfig;
    return RabbitMessaging.layer({
      uri: config.rabbitmqUri,
      connectionName: config.serviceName,
      queues: searchQueues,
    });
  }),
).pipe(Layer.provide(SearchConfig.layer));

export const SearchApplication = Layer.merge(
  SearchHttpServer,
  SearchConsumers,
).pipe(
  Layer.provide(SearchServices.layer),
  Layer.provide(RabbitLive),
  Layer.provide(SearchConfig.layer),
);
