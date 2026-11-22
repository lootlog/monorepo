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
import { SettingsDocumentsRepository } from "./settings-documents.repository.js";
import {
  makeSettingsDocuments,
  type GuildSettingsDocumentsResponse as ServiceGuildSettingsDocumentsResponse,
  type SettingsDocumentsResponse as ServiceSettingsDocumentsResponse,
} from "./settings-documents.service.js";

export class SettingsOperationError extends TaggedErrorClass<
  SettingsOperationError,
  { readonly brand: unique symbol }
>()("SettingsOperationError", { cause: Schema.Defect() }) {}

export type SettingsDocumentsOperation = Effect.Effect<
  SettingsDocumentsResponse,
  SettingsOperationError
>;

export type GuildSettingsDocumentsOperation = Effect.Effect<
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
