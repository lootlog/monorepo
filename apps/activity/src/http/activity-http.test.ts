import { describe, expect, it } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { Effect } from "effect";
import type { ActivityRepositoryValue } from "#src/activities/activity-repository";
import type {
  ActivityHealthValue,
  ActivityHttpServices,
} from "./activity-http.js";
import { makeActivityHandler } from "./activity-http.js";

const repository: ActivityRepositoryValue = {
  create: () => Effect.succeed({}),
  clearActiveSessionsForMember: () => Effect.void,
  findMany: (query) =>
    Effect.succeed({
      data: [{ guildId: query.guildId, userId: query.userId }],
      hasMore: false,
    }),
  findOne: (id, guildId) => Effect.succeed({ id, guildId }),
  deleteOne: () => Effect.succeed(1),
  memberStats: () => Effect.succeed([]),
  suggestActorNames: () => Effect.succeed(["Hero"]),
  suggestWorlds: () => Effect.succeed(["Tempest"]),
  suggestClanNames: () => Effect.succeed(["Clan"]),
};
const health: ActivityHealthValue = {
  check: () =>
    Effect.succeed({ status: "ok", info: {}, error: null, details: {} }),
};
const services = (capabilities: Permission[]): ActivityHttpServices => ({
  repository,
  health,
  permissions: {
    resolveGuildId: (id) => Effect.succeed(id === "vanity" ? "guild-id" : id),
    getUserGuildPermissions: () => Effect.succeed(capabilities),
  },
});
const headers = { "x-auth-discord-id": "discord", "x-auth-user-id": "user" };

describe("Activity HTTP contract", () => {
  it("requires the deployed forward-auth headers", async () => {
    const response = await makeActivityHandler(services([Permission.ADMIN]))(
      new Request("https://activity/guilds/g/activity-logs"),
    );
    expect(response.status).toBe(401);
  });

  it("resolves vanity organizations before querying", async () => {
    const response = await makeActivityHandler(services([Permission.ADMIN]))(
      new Request("https://activity/guilds/vanity/activity-logs", { headers }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [{ guildId: "guild-id" }],
      hasMore: false,
    });
  });

  it("requires OWNER for deletion", async () => {
    const forbidden = await makeActivityHandler(services([Permission.ADMIN]))(
      new Request("https://activity/guilds/g/activity-logs/a", {
        method: "DELETE",
        headers,
      }),
    );
    const allowed = await makeActivityHandler(services([Permission.OWNER]))(
      new Request("https://activity/guilds/g/activity-logs/a", {
        method: "DELETE",
        headers,
      }),
    );
    expect(forbidden.status).toBe(403);
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toEqual({ count: 1 });
  });

  it("keeps suggestion response envelopes", async () => {
    const response = await makeActivityHandler(services([Permission.ADMIN]))(
      new Request(
        "https://activity/guilds/g/activity-logs/actor-name-suggestions",
        { headers },
      ),
    );
    expect(await response.json()).toEqual({ suggestions: ["Hero"] });
  });
});
