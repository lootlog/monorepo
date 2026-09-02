import { Effect, Layer } from "effect";
import { ApiDatabaseLive } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import { DocsRepository } from "#src/docs/docs.repository";
import { DocsService } from "#src/docs/docs.service";
import { SettingsDocumentsRepository } from "#src/settings-documents/settings-documents.repository";
import { SettingsDocumentsService } from "#src/settings-documents/settings-documents.service";
import { SoundSettingsService } from "#src/sound-settings/sound-settings.service";
import { TimerSettingsService } from "#src/timer-settings/timer-settings.service";
import { MapTemplatesData } from "../handlers/map-templates/map-templates.handlers.js";
import { LootlogConfigData } from "../handlers/lootlog-config/lootlog-config.handlers.js";
import { DocsData } from "../handlers/docs/docs.handlers.js";
import { SettingsData } from "../handlers/settings/settings.handlers.js";

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

export const NativeApiDataLayers = Layer.mergeAll(
  MapTemplatesData.layerDatabase,
  LootlogConfigData.layerDatabase,
  NativeSettingsData,
  NativeDocsData,
).pipe(Layer.provide(ApiDatabaseLive));
