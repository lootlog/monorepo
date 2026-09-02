import { Context, Effect, Layer, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import type { SettingsDocumentsService } from "#src/settings-documents/settings-documents.service";
import type { SoundSettingsService } from "#src/sound-settings/sound-settings.service";
import type { TimerSettingsService } from "#src/timer-settings/timer-settings.service";
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
  static layerServices(options: {
    readonly timer: TimerSettingsService;
    readonly documents: SettingsDocumentsService;
    readonly sound: SoundSettingsService;
  }) {
    const attempt = (operation: () => unknown | PromiseLike<unknown>) =>
      Effect.tryPromise({
        try: () => Promise.resolve(operation()),
        catch: (cause) => new SettingsOperationError({ cause }),
      });
    const mutable = <A>(value: unknown): A =>
      JSON.parse(JSON.stringify(value)) as A;

    return Layer.succeed(
      SettingsData,
      SettingsData.of({
        getGlobalTimerSettings: (userId) =>
          attempt(() => options.timer.getGlobalSettings(userId)),
        updateGlobalTimerSettings: (userId, payload) =>
          attempt(() =>
            options.timer.updateGlobalSettings(userId, mutable(payload)),
          ),
        getGuildTimerSettings: (userId, guildId) =>
          attempt(() => options.timer.getGuildSettings(userId, guildId)),
        updateGuildTimerSettings: (userId, guildId, payload) =>
          attempt(() =>
            options.timer.updateGuildSettings(
              userId,
              guildId,
              mutable(payload),
            ),
          ),
        migrateTimerSettings: (userId, payload) =>
          attempt(() =>
            options.timer.migrateSettings(userId, mutable(payload)),
          ),
        getPreferences: (userId, query) =>
          attempt(() =>
            options.documents.getPreferences(userId, {
              domains: options.documents.parseDomains(query.domains),
              gameAccountId: query.gameAccountId,
              characterId: query.characterId,
              guildId: query.guildId,
            }),
          ),
        patchPreferences: (userId, payload) =>
          attempt(() =>
            options.documents.patchPreferences(userId, mutable(payload)),
          ),
        getSoundSettings: (userId) =>
          attempt(() => options.sound.getSettings(userId)),
        updateSoundSettings: (userId, payload) =>
          attempt(() => options.sound.updateSettings(userId, mutable(payload))),
      }),
    );
  }
}

const normalize = (value: unknown) => JSON.parse(JSON.stringify(value));

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(normalize(value)).pipe(
    Effect.mapError((cause) => new SettingsOperationError({ cause })),
  );

const withIdentity = <A>(
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
  });

export const getGlobalTimerSettings = () =>
  withIdentity((userId, data) =>
    Effect.flatMap(data.getGlobalTimerSettings(userId), (value) =>
      decode(TimerSettingsControllerGetGlobalSettings200, value),
    ),
  );

export const updateGlobalTimerSettings = (payload: UpdateTimerSettingsDto) =>
  withIdentity((userId, data) =>
    Effect.flatMap(data.updateGlobalTimerSettings(userId, payload), (value) =>
      decode(TimerSettingsControllerUpdateGlobalSettings200, value),
    ),
  );

export const getGuildTimerSettings = (guildId: string) =>
  withIdentity((userId, data) =>
    Effect.flatMap(data.getGuildTimerSettings(userId, guildId), (value) =>
      decode(TimerSettingsControllerGetGuildSettings200, value),
    ),
  );

export const updateGuildTimerSettings = (
  guildId: string,
  payload: UpdateGuildTimerSettingsDto,
) =>
  withIdentity((userId, data) =>
    Effect.flatMap(
      data.updateGuildTimerSettings(userId, guildId, payload),
      (value) => decode(TimerSettingsControllerUpdateGuildSettings200, value),
    ),
  );

export const migrateTimerSettings = (payload: MigrateTimerSettingsDto) =>
  withIdentity((userId, data) => data.migrateTimerSettings(userId, payload));

export const getPreferences = (
  query: SettingsDocumentsControllerGetPreferencesQuery,
) =>
  withIdentity((userId, data) =>
    Effect.flatMap(data.getPreferences(userId, query), (value) =>
      decode(SettingsDocumentsControllerGetPreferences200, value),
    ),
  );

export const patchPreferences = (payload: PatchSettingsDocumentsDto) =>
  withIdentity((userId, data) =>
    Effect.flatMap(data.patchPreferences(userId, payload), (value) =>
      decode(SettingsDocumentsControllerPatchPreferences200, value),
    ),
  );

export const getSoundSettings = () =>
  withIdentity((userId, data) =>
    Effect.flatMap(data.getSoundSettings(userId), (value) =>
      decode(SoundSettingsControllerGetSettings200, value),
    ),
  );

export const updateSoundSettings = (payload: UpdateSoundSettingsDto) =>
  withIdentity((userId, data) =>
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
