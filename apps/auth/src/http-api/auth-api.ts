/** Authoritative composition root for the auth HTTP contract. */
import { HttpApi, OpenApi } from "effect/unstable/httpapi";
import { HealthGroup } from "./contracts/health/api.js";
import { AuthGroup } from "./contracts/auth/api.js";

export class AuthApi extends HttpApi.make("AuthApi")
  .annotate(OpenApi.Title, "Auth API")
  .annotate(OpenApi.Version, "1.0")
  .annotate(
    OpenApi.Description,
    "Authentication and identity service documentation",
  )
  .annotate(OpenApi.Servers, [])
  .add(HealthGroup, AuthGroup) {}
