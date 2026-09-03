import { describe, expect, it } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import {
  ActivityRepository,
  type ActivityRepositoryValue,
} from "#src/activities/activity-repository";
import { Permissions } from "#src/activities/activity-permissions";
import {
  ActivityHealth,
  ActivityRoutes,
  type ActivityHealthValue,
} from "./activity-http.js";

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
const makeBoundary = (capabilities: Permission[]) => {
  const routes = ActivityRoutes.pipe(
    Layer.provide(Layer.succeed(ActivityRepository, repository)),
    Layer.provide(Layer.succeed(ActivityHealth, health)),
    Layer.provide(
      Layer.succeed(
        Permissions,
        Permissions.of({
          resolveGuildId: (id) =>
            Effect.succeed(id === "vanity" ? "guild-id" : id),
          getUserGuildPermissions: () => Effect.succeed(capabilities),
        }),
      ),
    ),
    Layer.provide(HttpServer.layerServices),
  );
  const boundary = HttpRouter.toWebHandler(routes, { disableLogger: true });
  return {
    dispose: boundary.dispose,
    handler: boundary.handler as (request: Request) => Promise<Response>,
  };
};
const headers = {
  authorization: "Bearer forwarded",
  "x-auth-discord-id": "discord",
  "x-auth-user-id": "user",
};

describe("Activity HttpApi contract", () => {
  it("requires the deployed forward-auth headers", async () => {
    const boundary = makeBoundary([Permission.ADMIN]);
    const response = await boundary.handler(
      new Request("https://activity/guilds/g/activity-logs", {
        headers: { authorization: "Bearer forwarded" },
      }),
    );
    expect(response.status).toBe(401);
    await boundary.dispose();
  });

  it("resolves vanity organizations before querying", async () => {
    const boundary = makeBoundary([Permission.ADMIN]);
    const response = await boundary.handler(
      new Request("https://activity/guilds/vanity/activity-logs", { headers }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [{ guildId: "guild-id" }],
      hasMore: false,
    });
    await boundary.dispose();
  });

  it("requires OWNER for deletion", async () => {
    const admin = makeBoundary([Permission.ADMIN]);
    const owner = makeBoundary([Permission.OWNER]);
    const forbidden = await admin.handler(
      new Request("https://activity/guilds/g/activity-logs/a", {
        method: "DELETE",
        headers,
      }),
    );
    const allowed = await owner.handler(
      new Request("https://activity/guilds/g/activity-logs/a", {
        method: "DELETE",
        headers,
      }),
    );
    expect(forbidden.status).toBe(403);
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toEqual({ count: 1 });
    await Promise.all([admin.dispose(), owner.dispose()]);
  });

  it("keeps suggestion response envelopes", async () => {
    const boundary = makeBoundary([Permission.ADMIN]);
    const response = await boundary.handler(
      new Request(
        "https://activity/guilds/g/activity-logs/actor-name-suggestions",
        { headers },
      ),
    );
    expect(await response.json()).toEqual({ suggestions: ["Hero"] });
    await boundary.dispose();
  });
});
