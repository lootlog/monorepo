import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from "effect/unstable/httpapi";
import { ApiKeyStatus } from "@lootlog/schema/api-key-access";
import {
  ApiKeySummary,
  ApiKeyStatusRequest,
  CreateApiKey,
  RenameApiKey,
} from "#src/auth/api-key-service";

const error = [400, 401, 403, 404, 409, 429, 503].map((status) =>
  Schema.Struct({ message: Schema.String }).pipe(HttpApiSchema.status(status)),
);

export class ApiKeysGroup extends HttpApiGroup.make("apiKeys").add(
  HttpApiEndpoint.get("ListApiKeys", "/auth/api-keys", {
    error,
    success: Schema.Struct({ keys: Schema.Array(ApiKeySummary) }),
  }),
  HttpApiEndpoint.post("CreateApiKey", "/auth/api-keys", {
    error,
    payload: CreateApiKey,
    success: Schema.Struct({ ...ApiKeySummary.fields, key: Schema.String }),
  }),
  HttpApiEndpoint.patch("RenameApiKey", "/auth/api-keys/:id", {
    error,
    params: Schema.Struct({ id: Schema.NonEmptyString }),
    payload: RenameApiKey,
    success: ApiKeySummary,
  }),
  HttpApiEndpoint.delete("DeleteApiKey", "/auth/api-keys/:id", {
    error,
    params: Schema.Struct({ id: Schema.NonEmptyString }),
    success: Schema.Struct({ success: Schema.Literal(true) }),
  }),
  HttpApiEndpoint.post("ApiKeyStatuses", "/auth/internal/api-keys/status", {
    error,
    payload: ApiKeyStatusRequest,
    success: Schema.Struct({ keys: Schema.Array(ApiKeyStatus) }),
  }),
) {}
