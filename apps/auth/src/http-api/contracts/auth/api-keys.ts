import { Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import {
  ApiKeySummary,
  CreateApiKey,
  RenameApiKey,
} from "#src/auth/api-key-service";
import {
  BadRequest,
  Conflict,
  Forbidden,
  NotFound,
  ServiceUnavailable,
  Unauthorized,
} from "./errors.js";

const sessionError = [Unauthorized, Forbidden, ServiceUnavailable];

export class ApiKeysGroup extends HttpApiGroup.make("apiKeys")
  .add(
    HttpApiEndpoint.get("ListApiKeys", "/auth/api-keys", {
      error: sessionError,
      success: Schema.Struct({ keys: Schema.Array(ApiKeySummary) }),
    }),
    HttpApiEndpoint.post("CreateApiKey", "/auth/api-keys", {
      error: [...sessionError, BadRequest, NotFound, Conflict],
      payload: CreateApiKey,
      success: Schema.Struct({ ...ApiKeySummary.fields, key: Schema.String }),
    }),
    HttpApiEndpoint.patch("RenameApiKey", "/auth/api-keys/:id", {
      error: [...sessionError, NotFound],
      params: Schema.Struct({ id: Schema.NonEmptyString }),
      payload: RenameApiKey,
      success: ApiKeySummary,
    }),
    HttpApiEndpoint.delete("DeleteApiKey", "/auth/api-keys/:id", {
      error: [...sessionError, NotFound],
      params: Schema.Struct({ id: Schema.NonEmptyString }),
      success: Schema.Struct({ success: Schema.Literal(true) }),
    }),
  )
  .annotate(HttpApi.PayloadParseOptions, { onExcessProperty: "error" }) {}
