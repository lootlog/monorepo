import { configureMeilisearchIndexes } from "@lootlog/meilisearch/index-settings";
import type { SearchOperationFailure } from "@lootlog/meilisearch/operation-failure";
import { Context, Effect, Layer, Redacted } from "effect";
import { Meilisearch } from "meilisearch";
import { makeCatalogModule } from "#src/catalog/catalog.service";
import { CatalogConfig } from "#src/config/catalog-config";
import {
  type CatalogWriteFailure,
  makeCatalogStore,
} from "#src/database/catalog-store";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { CatalogDatabase } from "#src/database/database";
import {
  type IndexItemsCommand,
  type ItemEntry,
  type ItemRevisionsCommand,
  makeItemsModule,
  type MonsterDropsCommand,
} from "#src/items/items.service";
import {
  type IndexNpcsCommand,
  makeNpcsModule,
  type MonsterLocationsCommand,
  type NpcEntry,
} from "#src/npcs/npcs.service";
import { catalogIndexSettings } from "#src/projection/index-settings";
import { effectLogger } from "#src/shared/logger";
import type {
  CatalogControllerGetEventsQuery,
  CatalogControllerGetIndexQuery,
  CatalogControllerGetItemsQuery,
  CatalogControllerGetNpcsQuery,
  CatalogEventsResponseDto_Output,
  CatalogIndexResponseDto_Output,
  CatalogItemsResponseDto_Output,
  CatalogNpcsResponseDto_Output,
} from "./contracts/catalog/schemas.js";

/** Searches read Meilisearch; lookups and listings read the database. */
type CatalogReadFailure = SearchOperationFailure | EffectDrizzleQueryError;

export interface CatalogOperationsValue {
  readonly catalogItems: (
    query: CatalogControllerGetItemsQuery,
  ) => Effect.Effect<CatalogItemsResponseDto_Output, CatalogReadFailure>;
  readonly catalogNpcs: (
    query: CatalogControllerGetNpcsQuery,
  ) => Effect.Effect<CatalogNpcsResponseDto_Output, CatalogReadFailure>;
  readonly catalogEvents: (
    query: CatalogControllerGetEventsQuery,
  ) => Effect.Effect<CatalogEventsResponseDto_Output, CatalogReadFailure>;
  readonly catalogIndex: (
    query: CatalogControllerGetIndexQuery,
  ) => Effect.Effect<CatalogIndexResponseDto_Output, CatalogReadFailure>;
  readonly indexItems: (
    data: IndexItemsCommand,
  ) => Effect.Effect<void, CatalogWriteFailure>;
  readonly setMonsterDrops: (
    data: MonsterDropsCommand,
  ) => Effect.Effect<void, CatalogWriteFailure>;
  readonly setItemRevisions: (
    data: ItemRevisionsCommand,
  ) => Effect.Effect<void, CatalogWriteFailure>;
  readonly indexNpcs: (
    data: IndexNpcsCommand,
  ) => Effect.Effect<void, CatalogWriteFailure>;
  readonly setNpcLocations: (
    data: MonsterLocationsCommand,
  ) => Effect.Effect<void, CatalogWriteFailure>;
}

export class CatalogOperations extends Context.Service<
  CatalogOperations,
  CatalogOperationsValue
>()("@lootlog/catalog/CatalogOperations") {
  static readonly layer = Layer.effect(
    CatalogOperations,
    Effect.gen(function* () {
      const config = yield* CatalogConfig;
      const database = yield* CatalogDatabase;

      const meilisearch = new Meilisearch({
        host: config.meilisearchHost,
        apiKey: Redacted.value(config.meilisearchApiKey),
      });

      const { read, write } = makeCatalogStore<ItemEntry, NpcEntry>(
        database,
        meilisearch,
      );

      const items = makeItemsModule(write, effectLogger);
      const npcs = makeNpcsModule(write, effectLogger);
      const catalog = makeCatalogModule(meilisearch, read, effectLogger);

      yield* configureMeilisearchIndexes(
        meilisearch,
        catalogIndexSettings,
        effectLogger,
      );

      return CatalogOperations.of({
        catalogItems: catalog.getItems,
        catalogNpcs: catalog.getNpcs,
        catalogEvents: catalog.getEvents,
        catalogIndex: catalog.getIndex,
        indexItems: items.indexItems,
        setMonsterDrops: items.setMonsterDrops,
        setItemRevisions: items.setItemRevisions,
        indexNpcs: npcs.indexNpcs,
        setNpcLocations: npcs.setLocations,
      });
    }),
  );
}
