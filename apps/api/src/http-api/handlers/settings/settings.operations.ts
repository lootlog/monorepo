import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  SettingsDocumentsResponseSchema,
  type SettingsDocumentsResponse,
} from "@lootlog/schema/settings-documents";
import { Context, Effect, Layer, Schema } from "effect";
import { HttpServerResponse } from "effect/unstable/http";
import { SettingsDocumentsRepository } from "#src/settings-documents/settings-documents.repository";
import { makeSettingsDocuments } from "#src/settings-documents/settings-documents.service";
import { makeSoundSettings } from "#src/sound-settings/sound-settings.service";
import { makeTimerSettings } from "#src/timer-settings/timer-settings.service";
import {
  SoundSettingsControllerGetSettings200,
  SoundSettingsControllerUpdateSettings200,
  type UpdateSoundSettingsDto,
} from "../../contracts/sound-settings/schemas.js";
import {
  TimerSettingsControllerGetGlobalSettings200,
  TimerSettingsControllerGetGuildSettings200,
  TimerSettingsControllerUpdateGlobalSettings200,
  TimerSettingsControllerUpdateGuildSettings200,
  type MigrateTimerSettingsDto,
  type UpdateGuildTimerSettingsDto,
  type UpdateTimerSettingsDto,
} from "../../contracts/timer-settings/schemas.js";
import type {
  PatchSettingsDocumentsDto,
  SettingsDocumentsControllerGetPreferencesQuery,
} from "../../contracts/preferences/schemas.js";

export class SettingsAccessDenied extends TaggedErrorClass<SettingsAccessDenied>()(
  "SettingsAccessDenied",
  {
    status: Schema.Literal(401),
    code: Schema.String,
  },
) {}

export class SettingsOperationError extends TaggedErrorClass<SettingsOperationError>()(
  "SettingsOperationError",
  { cause: Schema.Defect() },
) {}

export class SettingsIdentity extends Context.Service<
  SettingsIdentity,
  { readonly userId: Effect.Effect<string, SettingsAccessDenied> }
>()("@lootlog/api/http-api/settings/identity") {}

type Operation = Effect.Effect<unknown, SettingsOperationError>;
type SettingsDocumentsOperation = Effect.Effect<
  SettingsDocumentsResponse,
  SettingsOperationError
>;

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
    ) => SettingsDocumentsOperation;
    readonly patchPreferences: (
      userId: string,
      payload: PatchSettingsDocumentsDto,
    ) => SettingsDocumentsOperation;
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
      const settingsDocumentsResponse = (value: unknown) =>
        Schema.decodeUnknownEffect(
          Schema.toType(SettingsDocumentsResponseSchema),
        )(value).pipe(
          Effect.mapError((cause) => new SettingsOperationError({ cause })),
        );

      return SettingsData.of({
        getGlobalTimerSettings: (userId) =>
          operation(timer.getGlobalSettings(userId)),
        updateGlobalTimerSettings: (userId, payload) =>
          operation(timer.updateGlobalSettings(userId, payload)),
        getGuildTimerSettings: (userId, guildId) =>
          operation(timer.getGuildSettings(userId, guildId)),
        updateGuildTimerSettings: (userId, guildId, payload) =>
          operation(timer.updateGuildSettings(userId, guildId, payload)),
        migrateTimerSettings: (userId, payload) =>
          operation(timer.migrateSettings(userId, payload)),
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
          ).pipe(Effect.flatMap(settingsDocumentsResponse)),
        patchPreferences: (userId, payload) =>
          operation(documents.patchPreferences(userId, payload)).pipe(
            Effect.flatMap(settingsDocumentsResponse),
          ),
        getSoundSettings: (userId) => operation(sound.getSettings(userId)),
        updateSoundSettings: (userId, payload) =>
          operation(sound.updateSettings(userId, payload)),
      });
    }),
  ).pipe(Layer.provide(SettingsDocumentsRepository.layerDatabase));
}

const decode = <A, I, R>(schema: Schema.Codec<A, I, R>, value: unknown) =>
  Schema.decodeUnknownEffect(schema)(value).pipe(
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
    data.getPreferences(userId, query),
  );

export const patchPreferences = (payload: PatchSettingsDocumentsDto) =>
  withIdentity("SettingsDocumentsControllerPatchPreferences", (userId, data) =>
    data.patchPreferences(userId, payload),
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

export const toSettingsHttpResponse = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
) =>
  Effect.catch(effect, (error) =>
    error instanceof SettingsAccessDenied
      ? Effect.succeed(HttpServerResponse.empty({ status: error.status }))
      : Effect.die(defectCause(error)),
  );
