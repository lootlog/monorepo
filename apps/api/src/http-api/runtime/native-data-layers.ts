import { Effect, Layer } from "effect";
import { ApiDatabaseLive } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import { SettingsDocumentsRepository } from "#src/settings-documents/settings-documents.repository";
import { SettingsDocumentsService } from "#src/settings-documents/settings-documents.service";
import { SoundSettingsService } from "#src/sound-settings/sound-settings.service";
import { TimerSettingsService } from "#src/timer-settings/timer-settings.service";
import { MapTemplatesData } from "../handlers/map-templates/map-templates.handlers.js";
import { LootlogConfigData } from "../handlers/lootlog-config/lootlog-config.handlers.js";
import { SettingsData } from "../handlers/settings/settings.handlers.js";

const NativeSettingsData = Layer.effect(
  SettingsData,
  Effect.acquireRelease(
    Effect.sync(() => {
      const runtime = new DrizzleDatabaseRuntime();
      const documents = new SettingsDocumentsService(
        new SettingsDocumentsRepository(runtime),
      );
      return {
        runtime,
        service: SettingsData.makeServices({
          documents,
          timer: new TimerSettingsService(documents),
          sound: new SoundSettingsService(documents),
        }),
      };
    }),
    ({ runtime }) => Effect.promise(() => runtime.onApplicationShutdown()),
  ).pipe(Effect.map(({ service }) => service)),
);

export const NativeApiDataLayers = Layer.mergeAll(
  MapTemplatesData.layerDatabase,
  LootlogConfigData.layerDatabase,
  NativeSettingsData,
).pipe(Layer.provide(ApiDatabaseLive));
