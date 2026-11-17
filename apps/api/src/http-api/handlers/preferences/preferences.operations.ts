import {
  SettingsOperationError,
  SettingsData,
} from "#src/settings-documents/settings-data";
import {
  httpErrorResponse,
  statusCodeResponse,
} from "#src/shared/http/handler-response";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import type {
  GuildSettingsDocumentsQuery,
  PatchSettingsDocuments,
  SettingsDocumentsQuery,
} from "@lootlog/schema/settings-documents";
import { Context, Effect, Schema } from "effect";

import { applicationErrorResponse } from "../../application-error-response.js";
import { SettingsRequestError } from "#src/settings-documents/settings-documents.service";

export class SettingsAccessDenied extends TaggedErrorClass<SettingsAccessDenied>()(
  "SettingsAccessDenied",
  {
    status: Schema.Literal(401),
    code: Schema.String,
  },
) {}

export class SettingsIdentity extends Context.Service<
  SettingsIdentity,
  { readonly userId: Effect.Effect<string, SettingsAccessDenied> }
>()("@lootlog/api/http-api/settings/identity") {}

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
