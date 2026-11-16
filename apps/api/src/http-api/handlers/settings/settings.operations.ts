import {
  httpErrorResponse,
  statusCodeResponse,
} from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  GuildSettingsDocumentsResponseSchema,
  SettingsDocumentsResponseSchema,
  type GuildSettingsDocumentsQuery,
  type GuildSettingsDocumentsResponse,
  type SettingsDocumentsResponse,
  type PatchSettingsDocuments,
  type SettingsDocumentsQuery,
} from "@lootlog/schema/settings-documents";
import { Context, Effect, Layer, Schema } from "effect";
import { SettingsDocumentsRepository } from "#src/settings-documents/settings-documents.repository";
import { applicationErrorResponse } from "../../application-error-response.js";
import {
  SettingsRequestError,
  makeSettingsDocuments,
  type GuildSettingsDocumentsResponse as ServiceGuildSettingsDocumentsResponse,
  type SettingsDocumentsResponse as ServiceSettingsDocumentsResponse,
} from "#src/settings-documents/settings-documents.service";

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

type SettingsDocumentsOperation = Effect.Effect<
  SettingsDocumentsResponse,
  SettingsOperationError
>;

type GuildSettingsDocumentsOperation = Effect.Effect<
  GuildSettingsDocumentsResponse,
  SettingsOperationError
>;

export class SettingsData extends Context.Service<
  SettingsData,
  {
    readonly getPreferences: (
      userId: string,
      query: SettingsDocumentsQuery,
    ) => SettingsDocumentsOperation;
    readonly getGuildPreferences: (
      userId: string,
      query: GuildSettingsDocumentsQuery,
    ) => GuildSettingsDocumentsOperation;
    readonly patchPreferences: (
      userId: string,
      payload: PatchSettingsDocuments,
    ) => SettingsDocumentsOperation;
  }
>()("@lootlog/api/http-api/settings/data") {
  static readonly layerDatabase = Layer.effect(
    SettingsData,
    Effect.map(SettingsDocumentsRepository, (repository) => {
      const documents = makeSettingsDocuments(repository);

      const operation = <A, E>(effect: Effect.Effect<A, E>) =>
        effect.pipe(
          Effect.mapError((cause) => new SettingsOperationError({ cause })),
        );

      const settingsDocumentsResponse = (
        value: ServiceSettingsDocumentsResponse,
      ) =>
        Schema.decodeUnknownEffect(
          Schema.toType(SettingsDocumentsResponseSchema),
        )(value).pipe(
          Effect.mapError((cause) => new SettingsOperationError({ cause })),
        );

      const guildSettingsDocumentsResponse = (
        value: ServiceGuildSettingsDocumentsResponse,
      ) =>
        Schema.decodeUnknownEffect(
          Schema.toType(GuildSettingsDocumentsResponseSchema),
        )(value).pipe(
          Effect.mapError((cause) => new SettingsOperationError({ cause })),
        );

      return SettingsData.of({
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
        getGuildPreferences: (userId, query) =>
          operation(
            Effect.flatMap(
              Effect.all([
                documents.parseDomains(query.domains),
                documents.parseGuildIds(query.guildIds),
              ]),
              ([domains, guildIds]) =>
                documents.getGuildPreferences(userId, { domains, guildIds }),
            ),
          ).pipe(Effect.flatMap(guildSettingsDocumentsResponse)),
        patchPreferences: (userId, payload) =>
          operation(documents.patchPreferences(userId, payload)).pipe(
            Effect.flatMap(settingsDocumentsResponse),
          ),
      });
    }),
  ).pipe(Layer.provide(SettingsDocumentsRepository.layerDatabase));
}

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

export const getPreferences = (query: SettingsDocumentsQuery) =>
  withIdentity("SettingsDocumentsControllerGetPreferences", (userId, data) =>
    data.getPreferences(userId, query),
  );

export const getGuildPreferences = (query: GuildSettingsDocumentsQuery) =>
  withIdentity(
    "SettingsDocumentsControllerGetGuildPreferences",
    (userId, data) => data.getGuildPreferences(userId, query),
  );

export const patchPreferences = (payload: PatchSettingsDocuments) =>
  withIdentity("SettingsDocumentsControllerPatchPreferences", (userId, data) =>
    data.patchPreferences(userId, payload),
  );

type SettingsHttpFailure = SettingsAccessDenied | SettingsOperationError;

export const toSettingsHttpResponse = <A, R>(
  effect: Effect.Effect<A, SettingsHttpFailure, R>,
) =>
  Effect.catchTags(effect, {
    SettingsAccessDenied: statusCodeResponse,
    SettingsOperationError: (error) =>
      error.cause instanceof SettingsRequestError
        ? Effect.succeed(
            httpErrorResponse(error.cause.status, {
              code:
                error.cause.status === 403 ? "FORBIDDEN" : "INVALID_REQUEST",
              message: error.cause.message,
            }),
          )
        : applicationErrorResponse(error.cause),
  });
