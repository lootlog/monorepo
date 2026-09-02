import { Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { HttpApi, HttpApiBuilder } from "effect/unstable/httpapi";
import {
  HealthGroup,
  UserLootlogConfigGroup,
} from "../src/http-api/lootlog-api.generated.js";
import {
  UserLootlogConfigData,
  UserLootlogConfigHandlers,
} from "../src/http-api/handlers/user-lootlog-config/user-lootlog-config.handlers.js";
import {
  HealthHandlers,
  PublicSystemData,
} from "../src/http-api/handlers/public-system/public-system.handlers.js";
import { ForwardAuthMiddlewareLive } from "../src/http-api/runtime/forward-auth-middleware.js";
import { RequestIdentityLayers } from "../src/http-api/runtime/request-identity-layers.js";

class NativeBoundaryApi extends HttpApi.make("NativeBoundaryApi").add(
  HealthGroup,
  UserLootlogConfigGroup,
) {}

const accountResponse = {
  character: {
    userId: "user-1",
    accountId: "account-1",
    characterId: "character-1",
    catchingGuildIds: ["guild-1"],
  },
};

const BoundaryData = Layer.merge(
  Layer.succeed(
    PublicSystemData,
    PublicSystemData.of({
      healthCheck: Effect.void,
      getMaps: Effect.succeed([]),
      refreshStatsCard: () => Effect.succeed({}),
      getStatsCard: () => Effect.succeed(new Uint8Array()),
      statsCardCacheControl: "no-store",
    }),
  ),
  Layer.succeed(
    UserLootlogConfigData,
    UserLootlogConfigData.of({
      getAccount: (_discordId, _accountId) => Effect.succeed(accountResponse),
      upsertCharacter: (_discordId, accountId, payload) =>
        Effect.succeed({
          userId: "user-1",
          accountId,
          characterId: payload.characterId,
          catchingGuildIds: payload.catchingGuildIds,
        }),
      getPlayersCatchingGuilds: () => Effect.succeed({ players: [] }),
    }),
  ),
);

const BoundaryRoutes = HttpApiBuilder.layer(NativeBoundaryApi).pipe(
  Layer.provide(Layer.mergeAll(HealthHandlers, UserLootlogConfigHandlers)),
  Layer.provide(ForwardAuthMiddlewareLive),
  Layer.provide(RequestIdentityLayers),
  Layer.provide(BoundaryData),
  Layer.provide(HttpServer.layerServices),
);

describe("native API HTTP boundary", () => {
  const boundary = HttpRouter.toWebHandler(BoundaryRoutes, {
    disableLogger: true,
  });

  afterAll(() => boundary.dispose());

  it("serves health without initializing legacy controllers", async () => {
    const response = await boundary.handler(
      new Request("http://api.test/healthz"),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  it("rejects a bearer when Traefik forward-auth identity is absent", async () => {
    const response = await boundary.handler(
      new Request(
        "http://api.test/users/@me/lootlog-config/accounts/account-1",
        { headers: { authorization: "Bearer untrusted" } },
      ),
    );

    expect(response.status).toBe(401);
  });

  it("accepts the complete identity pair forwarded by auth service", async () => {
    const response = await boundary.handler(
      new Request(
        "http://api.test/users/@me/lootlog-config/accounts/account-1",
        {
          headers: {
            authorization: "Bearer already-validated-by-forward-auth",
            "x-auth-user-id": "user-1",
            "x-auth-discord-id": "discord-1",
          },
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(accountResponse);
  });
});
