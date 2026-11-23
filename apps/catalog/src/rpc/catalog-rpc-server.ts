import { CatalogRpcGroup } from "@lootlog/rpc/catalog";
import { RpcUnavailableError } from "@lootlog/rpc/errors";
import { serviceRpcServer } from "@lootlog/rpc/server";
import { Effect, Layer } from "effect";
import { CatalogConfig } from "#src/config/catalog-config";
import { CatalogOperations } from "#src/http-api/catalog-operations";

const CatalogRpcHandlers = CatalogRpcGroup.toLayer(
  Effect.gen(function* () {
    const catalog = yield* CatalogOperations;

    return CatalogRpcGroup.of({
      searchItems: ({ search, limit }) =>
        catalog.catalogItems({ search, limit }).pipe(
          Effect.mapBoth({
            onSuccess: ({ hits }) => ({
              hits: hits.map((item) => ({
                name: item.name,
                lvl: item.lvl,
                rarity: item.rarity ?? null,
              })),
            }),
            onFailure: () =>
              new RpcUnavailableError({
                message: "Catalog search unavailable",
              }),
          }),
        ),
    });
  }),
);

export const CatalogRpcServer = Layer.unwrap(
  Effect.map(CatalogConfig, ({ rpcPort }) =>
    serviceRpcServer({
      group: CatalogRpcGroup,
      handlers: CatalogRpcHandlers,
      port: rpcPort,
      spanPrefix: "catalog.rpc",
    }),
  ),
);
