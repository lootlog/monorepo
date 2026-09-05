import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  SettingsDocumentsResponseSchema,
  type SettingsDocumentsResponse,
  type PatchSettingsDocuments,
  type SettingsDocumentsQuery,
} from "@lootlog/schema/settings-documents";
import { Context, Effect, Layer, Schema } from "effect";
import { HttpServerResponse } from "effect/unstable/http";
import { SettingsDocumentsRepository } from "#src/settings-documents/settings-documents.repository";
import { applicationErrorResponse } from "../../application-error-response.js";
import {
  SettingsRequestError,
  makeSettingsDocuments,
} from "#src/settings-documents/settings-documents.service";
import { makeSoundSettings } from "#src/sound-settings/sound-settings.service";
import { makeTimerSettings } from "#src/timer-settings/timer-settings.service";
import {
  SoundSettingsResponse,
  type UpdateSoundSettingsRequest,
} from "#src/contracts/sound-settings/schemas";

import {
  TimerSettingsResponse,
  OrganizationTimerSettingsResponse,
  type MigrateTimerSettingsRequest,
  type UpdateOrganizationTimerSettingsRequest,
  type UpdateTimerSettingsRequest,
} from "#src/contracts/timer-settings/schemas";

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
      payload: UpdateTimerSettingsRequest,
    ) => Operation;
    readonly getGuildTimerSettings: (
      userId: string,
      guildId: string,
    ) => Operation;
    readonly updateGuildTimerSettings: (
      userId: string,
      guildId: string,
      payload: UpdateOrganizationTimerSettingsRequest,
    ) => Operation;
    readonly migrateTimerSettings: (
      userId: string,
      payload: MigrateTimerSettingsRequest,
    ) => Operation;
    readonly getPreferences: (
      userId: string,
      query: SettingsDocumentsQuery,
    ) => SettingsDocumentsOperation;
    readonly patchPreferences: (
      userId: string,
      payload: PatchSettingsDocuments,
    ) => SettingsDocumentsOperation;
    readonly getSoundSettings: (userId: string) => Operation;
    readonly updateSoundSettings: (
      userId: string,
      payload: UpdateSoundSettingsRequest,
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
      decode(TimerSettingsResponse, value),
    ),
  );

export const updateGlobalTimerSettings = (
  payload: UpdateTimerSettingsRequest,
) =>
  withIdentity("TimerSettingsControllerUpdateGlobalSettings", (userId, data) =>
    Effect.flatMap(data.updateGlobalTimerSettings(userId, payload), (value) =>
      decode(TimerSettingsResponse, value),
    ),
  );

export const getGuildTimerSettings = (guildId: string) =>
  withIdentity("TimerSettingsControllerGetGuildSettings", (userId, data) =>
    Effect.flatMap(data.getGuildTimerSettings(userId, guildId), (value) =>
      decode(OrganizationTimerSettingsResponse, value),
    ),
  );

export const updateGuildTimerSettings = (
  guildId: string,
  payload: UpdateOrganizationTimerSettingsRequest,
) =>
  withIdentity("TimerSettingsControllerUpdateGuildSettings", (userId, data) =>
    Effect.flatMap(
      data.updateGuildTimerSettings(userId, guildId, payload),
      (value) => decode(OrganizationTimerSettingsResponse, value),
    ),
  );

export const migrateTimerSettings = (payload: MigrateTimerSettingsRequest) =>
  withIdentity("TimerSettingsControllerMigrateSettings", (userId, data) =>
    data.migrateTimerSettings(userId, payload),
  );

export const getPreferences = (query: SettingsDocumentsQuery) =>
  withIdentity("SettingsDocumentsControllerGetPreferences", (userId, data) =>
    data.getPreferences(userId, query),
  );

export const patchPreferences = (payload: PatchSettingsDocuments) =>
  withIdentity("SettingsDocumentsControllerPatchPreferences", (userId, data) =>
    data.patchPreferences(userId, payload),
  );

export const getSoundSettings = () =>
  withIdentity("SoundSettingsControllerGetSettings", (userId, data) =>
    Effect.flatMap(data.getSoundSettings(userId), (value) =>
      decode(SoundSettingsResponse, value),
    ),
  );

export const updateSoundSettings = (payload: UpdateSoundSettingsRequest) =>
  withIdentity("SoundSettingsControllerUpdateSettings", (userId, data) =>
    Effect.flatMap(data.updateSoundSettings(userId, payload), (value) =>
      decode(SoundSettingsResponse, value),
    ),
  );

type SettingsHttpFailure = SettingsAccessDenied | SettingsOperationError;

export const toSettingsHttpResponse = <A, R>(
  effect: Effect.Effect<A, SettingsHttpFailure, R>,
) =>
  Effect.catchTags(effect, {
    SettingsAccessDenied: (error) =>
      Effect.succeed(
        HttpServerResponse.jsonUnsafe(
          { code: error.code },
          { status: error.status },
        ),
      ),
    SettingsOperationError: (error) =>
      error.cause instanceof SettingsRequestError
        ? Effect.succeed(
            HttpServerResponse.jsonUnsafe(
              { message: error.cause.message },
              { status: error.cause.status },
            ),
          )
        : applicationErrorResponse(error.cause),
  });
