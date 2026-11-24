import { ApiKeysGroup } from "./contracts/auth/api-keys.js";
import { HttpApi, OpenApi } from "effect/http-api";
import { healthGroup } from "@lootlog/instrumentation/service";
import { AuthGroup } from "./contracts/auth/api.js";
import { SchemaErrorResponse } from "@lootlog/protocol/http/schema-error-response";

export class AuthApi extends HttpApi.make("AuthApi")
  .annotate(OpenApi.Title, "Auth API")
  .annotate(OpenApi.Version, "1.0")
  .annotate(OpenApi.Description, "Discord sign-in, sessions and API keys.")
  .annotate(OpenApi.Servers, [])
  .add(healthGroup(), AuthGroup, ApiKeysGroup)
  .middleware(SchemaErrorResponse) {}
