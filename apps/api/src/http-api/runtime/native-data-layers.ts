import { Effect, Layer } from "effect";
import { ApiDatabaseLive } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import { DocsRepository } from "#src/docs/docs.repository";
import { DocsService } from "#src/docs/docs.service";
import { MapsService } from "#src/maps/maps.service";
import { PublicGuildStatsCardRepository } from "#src/public-guild-stats-card/public-guild-stats-card.repository";
import { PublicGuildStatsCardService } from "#src/public-guild-stats-card/public-guild-stats-card.service";
import { SettingsDocumentsRepository } from "#src/settings-documents/settings-documents.repository";
import { SettingsDocumentsService } from "#src/settings-documents/settings-documents.service";
import { SoundSettingsService } from "#src/sound-settings/sound-settings.service";
import { TimerSettingsService } from "#src/timer-settings/timer-settings.service";
import { MapTemplatesData } from "../handlers/map-templates/map-templates.handlers.js";
import { LootlogConfigData } from "../handlers/lootlog-config/lootlog-config.handlers.js";
import { DocsData } from "../handlers/docs/docs.handlers.js";
import { PublicSystemData } from "../handlers/public-system/public-system.handlers.js";
import { SettingsData } from "../handlers/settings/settings.handlers.js";
import { ApiRedis } from "./api-redis.js";
import { ApiRuntimeConfig } from "./api-runtime-config.js";

const makeScopedCompatibilityLayer = <I, S>(
  service: import("effect").Context.Key<I, S>,
  make: (runtime: DrizzleDatabaseRuntime) => S,
) =>
  Layer.effect(
    service,
    Effect.acquireRelease(
      Effect.sync(() => {
        const runtime = new DrizzleDatabaseRuntime();
        return { runtime, service: make(runtime) };
      }),
      ({ runtime }) => Effect.promise(() => runtime.onApplicationShutdown()),
    ).pipe(Effect.map(({ service: value }) => value)),
  );

const NativeSettingsData = makeScopedCompatibilityLayer(
  SettingsData,
  (runtime) => {
    const documents = new SettingsDocumentsService(
      new SettingsDocumentsRepository(runtime),
    );
    return SettingsData.makeServices({
      documents,
      timer: new TimerSettingsService(documents),
      sound: new SoundSettingsService(documents),
    });
  },
);

const NativeDocsData = makeScopedCompatibilityLayer(DocsData, (runtime) =>
  DocsData.makeLegacy(new DocsService(new DocsRepository(runtime))),
);

const NativePublicSystemData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const config = yield* ApiRuntimeConfig;
    return makeScopedCompatibilityLayer(PublicSystemData, (runtime) =>
      PublicSystemData.makeServices({
        maps: new MapsService(redis, config.mapsApiUrl),
        statsCard: new PublicGuildStatsCardService(
          new PublicGuildStatsCardRepository(runtime),
          redis,
          config.environment,
        ),
        local: config.environment === "local",
      }),
    );
  }),
);

export const NativeApiDataLayers = Layer.mergeAll(
  MapTemplatesData.layerDatabase,
  LootlogConfigData.layerDatabase,
  NativeSettingsData,
  NativeDocsData,
  NativePublicSystemData,
).pipe(Layer.provide(ApiDatabaseLive));
