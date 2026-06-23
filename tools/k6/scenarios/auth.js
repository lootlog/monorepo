import { apiRequest } from "../lib/http.js";

export function runAuth(config) {
  apiRequest(config, "auth", "health", "GET", "/healthz");
  apiRequest(config, "auth", "verify", "GET", "/auth/verify");

  if (config.auth.cookie) {
    apiRequest(config, "auth", "scopes", "GET", "/auth/@me/scopes", {
      optional: true,
    });
  }

  if (
    config.features.enableIdpToken &&
    config.fixtures.userId &&
    config.fixtures.discordId
  ) {
    apiRequest(config, "auth", "idp-token", "POST", "/auth/idp-token", {
      body: {
        discordId: config.fixtures.discordId,
        userId: config.fixtures.userId,
      },
      optional: true,
    });
  }
}
