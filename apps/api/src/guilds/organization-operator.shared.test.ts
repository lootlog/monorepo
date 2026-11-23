import { expect, test } from "bun:test";
import { RateLimitedError } from "@lootlog/protocol/http/errors";
import { AccountOrganizationOperationError } from "#src/guilds/account-organization-data";
import { syncRefreshFailure } from "./organization-operator.shared.js";

test("reports a Discord sync refresh inside its cooldown as a cooldown, not an outage", () => {
  const cooldown = new AccountOrganizationOperationError({
    cause: new RateLimitedError({
      code: "DISCORD_SYNC_REFRESH_COOLDOWN",
      message: "Discord sync was refreshed too recently",
      retryAfterMs: 60_000,
    }),
  });

  const outage = new AccountOrganizationOperationError({
    cause: new Error("Discord bot unavailable"),
  });

  expect(syncRefreshFailure(cooldown)._tag).toBe("OrganizationSyncCooldown");
  expect(syncRefreshFailure(outage)._tag).toBe("OrganizationOperatorError");
});
