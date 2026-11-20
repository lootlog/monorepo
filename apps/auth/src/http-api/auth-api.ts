import { ApiKeysGroup } from "./contracts/auth/api-keys.js";
/** Authoritative composition root for the auth HTTP contract. */
import { HttpApi, OpenApi } from "effect/http-api";
import { healthGroup } from "@lootlog/instrumentation/service";
import { AuthGroup } from "./contracts/auth/api.js";
import { SchemaErrorResponse } from "@lootlog/protocol/http/schema-error-response";

export class AuthApi extends HttpApi.make("AuthApi")
  .annotate(OpenApi.Title, "Auth API")
  .annotate(OpenApi.Version, "1.0")
  .annotate(
    OpenApi.Description,
    "Authentication and identity service documentation",
  )
  .annotate(OpenApi.Servers, [])
  .add(healthGroup(), AuthGroup, ApiKeysGroup)
  .middleware(SchemaErrorResponse) {}
