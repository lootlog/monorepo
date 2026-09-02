import { Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import { SettingsDocumentsRepository } from "#src/settings-documents/settings-documents.repository";
import { makeSettingsDocuments } from "#src/settings-documents/settings-documents.service";
import { makeSoundSettings } from "#src/sound-settings/sound-settings.service";
import { makeTimerSettings } from "#src/timer-settings/timer-settings.service";
import {
  LootlogApi,
  SettingsDocumentsControllerGetPreferences200,
  SettingsDocumentsControllerPatchPreferences200,
  SoundSettingsControllerGetSettings200,
  SoundSettingsControllerUpdateSettings200,
  TimerSettingsControllerGetGlobalSettings200,
  TimerSettingsControllerGetGuildSettings200,
  TimerSettingsControllerUpdateGlobalSettings200,
  TimerSettingsControllerUpdateGuildSettings200,
  type MigrateTimerSettingsDto,
  type PatchSettingsDocumentsDto,
  type SettingsDocumentsControllerGetPreferencesQuery,
  type UpdateGuildTimerSettingsDto,
  type UpdateSoundSettingsDto,
  type UpdateTimerSettingsDto,
} from "../../lootlog-api.generated.js";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class SettingsAccessDenied extends Schema.TaggedError<SettingsAccessDenied>()(
  "SettingsAccessDenied",
  {
    status: Schema.Literal(401),
    code: Schema.String,
  },
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class SettingsOperationError extends Schema.TaggedError<SettingsOperationError>()(
  "SettingsOperationError",
  { cause: Schema.Defect() },
) {}

export class SettingsIdentity extends Context.Service<
  SettingsIdentity,
  { readonly userId: Effect.Effect<string, SettingsAccessDenied> }
>()("@lootlog/api/http-api/settings/identity") {}

type Operation = Effect.Effect<unknown, SettingsOperationError>;

export class SettingsData extends Context.Service<
  SettingsData,
  {
    readonly getGlobalTimerSettings: (userId: string) => Operation;
    readonly updateGlobalTimerSettings: (
      userId: string,
      payload: UpdateTimerSettingsDto,
    ) => Operation;
    readonly getGuildTimerSettings: (
      userId: string,
      guildId: string,
    ) => Operation;
    readonly updateGuildTimerSettings: (
      userId: string,
      guildId: string,
      payload: UpdateGuildTimerSettingsDto,
    ) => Operation;
    readonly migrateTimerSettings: (
      userId: string,
      payload: MigrateTimerSettingsDto,
    ) => Operation;
    readonly getPreferences: (
      userId: string,
      query: SettingsDocumentsControllerGetPreferencesQuery,
    ) => Operation;
    readonly patchPreferences: (
      userId: string,
      payload: PatchSettingsDocumentsDto,
    ) => Operation;
    readonly getSoundSettings: (userId: string) => Operation;
    readonly updateSoundSettings: (
      userId: string,
      payload: UpdateSoundSettingsDto,
    ) => Operation;
  }
>()("@lootlog/api/http-api/settings/data") {
  static readonly layerDatabase = Layer.effect(
    SettingsData,
    Effect.map(SettingsDocumentsRepository, (repository) => {
      const documents = makeSettingsDocuments(repository);
      const timer = makeTimerSettings(documents);
      const sound = makeSoundSettings(documents);
      const operation = <A, E>(effect: Effect.Effect<A, E>) =>
        effect.pipe(
          Effect.mapError((cause) => new SettingsOperationError({ cause })),
        );
      const mutable = <A>(value: unknown): A =>
        JSON.parse(JSON.stringify(value)) as A;

      return SettingsData.of({
        getGlobalTimerSettings: (userId) =>
          operation(timer.getGlobalSettings(userId)),
        updateGlobalTimerSettings: (userId, payload) =>
          operation(timer.updateGlobalSettings(userId, mutable(payload))),
        getGuildTimerSettings: (userId, guildId) =>
          operation(timer.getGuildSettings(userId, guildId)),
        updateGuildTimerSettings: (userId, guildId, payload) =>
          operation(
            timer.updateGuildSettings(userId, guildId, mutable(payload)),
          ),
        migrateTimerSettings: (userId, payload) =>
          operation(timer.migrateSettings(userId, mutable(payload))),
        getPreferences: (userId, query) =>
          operation(
            Effect.flatMap(documents.parseDomains(query.domains), (domains) =>
              documents.getPreferences(userId, {
                domains,
                gameAccountId: query.gameAccountId,
                characterId: query.characterId,
                guildId: query.guildId,
              }),
            ),
          ),
        patchPreferences: (userId, payload) =>
          operation(documents.patchPreferences(userId, mutable(payload))),
        getSoundSettings: (userId) => operation(sound.getSettings(userId)),
        updateSoundSettings: (userId, payload) =>
          operation(sound.updateSettings(userId, mutable(payload))),
      });
    }),
  ).pipe(Layer.provide(SettingsDocumentsRepository.layerDatabase));
}

const normalize = (value: unknown) => JSON.parse(JSON.stringify(value));

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(normalize(value)).pipe(
    Effect.mapError((cause) => new SettingsOperationError({ cause })),
  );

const withIdentity = <A>(
  operationId: string,
  operation: (
    userId: string,
    data: SettingsData["Service"],
  ) => Effect.Effect<A, SettingsOperationError>,
) =>
  Effect.gen(function* () {
    const identity = yield* SettingsIdentity;
    const userId = yield* identity.userId;
    const data = yield* SettingsData;
    return yield* operation(userId, data);
  }).pipe(
    Effect.withSpan(operationId, {
      attributes: { operationId },
    }),
  );

export const getGlobalTimerSettings = () =>
  withIdentity("TimerSettingsControllerGetGlobalSettings", (userId, data) =>
    Effect.flatMap(data.getGlobalTimerSettings(userId), (value) =>
      decode(TimerSettingsControllerGetGlobalSettings200, value),
    ),
  );

export const updateGlobalTimerSettings = (payload: UpdateTimerSettingsDto) =>
  withIdentity("TimerSettingsControllerUpdateGlobalSettings", (userId, data) =>
    Effect.flatMap(data.updateGlobalTimerSettings(userId, payload), (value) =>
      decode(TimerSettingsControllerUpdateGlobalSettings200, value),
    ),
  );

export const getGuildTimerSettings = (guildId: string) =>
  withIdentity("TimerSettingsControllerGetGuildSettings", (userId, data) =>
    Effect.flatMap(data.getGuildTimerSettings(userId, guildId), (value) =>
      decode(TimerSettingsControllerGetGuildSettings200, value),
    ),
  );

export const updateGuildTimerSettings = (
  guildId: string,
  payload: UpdateGuildTimerSettingsDto,
) =>
  withIdentity("TimerSettingsControllerUpdateGuildSettings", (userId, data) =>
    Effect.flatMap(
      data.updateGuildTimerSettings(userId, guildId, payload),
      (value) => decode(TimerSettingsControllerUpdateGuildSettings200, value),
    ),
  );

export const migrateTimerSettings = (payload: MigrateTimerSettingsDto) =>
  withIdentity("TimerSettingsControllerMigrateSettings", (userId, data) =>
    data.migrateTimerSettings(userId, payload),
  );

export const getPreferences = (
  query: SettingsDocumentsControllerGetPreferencesQuery,
) =>
  withIdentity("SettingsDocumentsControllerGetPreferences", (userId, data) =>
    Effect.flatMap(data.getPreferences(userId, query), (value) =>
      decode(SettingsDocumentsControllerGetPreferences200, value),
    ),
  );

export const patchPreferences = (payload: PatchSettingsDocumentsDto) =>
  withIdentity("SettingsDocumentsControllerPatchPreferences", (userId, data) =>
    Effect.flatMap(data.patchPreferences(userId, payload), (value) =>
      decode(SettingsDocumentsControllerPatchPreferences200, value),
    ),
  );

export const getSoundSettings = () =>
  withIdentity("SoundSettingsControllerGetSettings", (userId, data) =>
    Effect.flatMap(data.getSoundSettings(userId), (value) =>
      decode(SoundSettingsControllerGetSettings200, value),
    ),
  );

export const updateSoundSettings = (payload: UpdateSoundSettingsDto) =>
  withIdentity("SoundSettingsControllerUpdateSettings", (userId, data) =>
    Effect.flatMap(data.updateSoundSettings(userId, payload), (value) =>
      decode(SoundSettingsControllerUpdateSettings200, value),
    ),
  );

const defectCause = (error: unknown) =>
  error instanceof SettingsOperationError ? error.cause : error;

const orDieHttpFailure = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.catch(effect, (error) => Effect.die(defectCause(error)));

export const TimerSettingsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "timer-settings",
  (handlers) =>
    handlers
      .handle("TimerSettingsControllerGetGlobalSettings", () =>
        orDieHttpFailure(getGlobalTimerSettings()),
      )
      .handle("TimerSettingsControllerUpdateGlobalSettings", ({ payload }) =>
        orDieHttpFailure(updateGlobalTimerSettings(payload)),
      )
      .handle("TimerSettingsControllerGetGuildSettings", ({ params }) =>
        orDieHttpFailure(getGuildTimerSettings(params.guildId)),
      )
      .handle(
        "TimerSettingsControllerUpdateGuildSettings",
        ({ params, payload }) =>
          orDieHttpFailure(updateGuildTimerSettings(params.guildId, payload)),
      )
      .handle("TimerSettingsControllerMigrateSettings", ({ payload }) =>
        orDieHttpFailure(
          Effect.map(migrateTimerSettings(payload), (result) =>
            HttpServerResponse.jsonUnsafe(result),
          ),
        ),
      ),
);

export const PreferencesHandlers = HttpApiBuilder.group(
  LootlogApi,
  "preferences",
  (handlers) =>
    handlers
      .handle("SettingsDocumentsControllerGetPreferences", ({ query }) =>
        orDieHttpFailure(getPreferences(query)),
      )
      .handle("SettingsDocumentsControllerPatchPreferences", ({ payload }) =>
        orDieHttpFailure(patchPreferences(payload)),
      ),
);

export const SoundSettingsHandlers = HttpApiBuilder.group(
  LootlogApi,
  "sound-settings",
  (handlers) =>
    handlers
      .handle("SoundSettingsControllerGetSettings", () =>
        orDieHttpFailure(getSoundSettings()),
      )
      .handle("SoundSettingsControllerUpdateSettings", ({ payload }) =>
        orDieHttpFailure(updateSoundSettings(payload)),
      ),
);
