import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { afterAll, expect, it } from "bun:test";
import { BunHttpServer } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { HttpApi, HttpApiBuilder } from "effect/unstable/httpapi";
import { HttpRouter } from "effect/unstable/http";
import {
  ApiDatabase,
  type ApiDatabaseValue,
} from "#src/database/drizzle/database";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "#src/shared/http/http-errors";
import { MessagingGroup } from "./contracts/messaging/api.js";
import { LootlogConfigGroup } from "./contracts/lootlog-config/api.js";
import { PartyReadyRoomGroup } from "./contracts/party-ready-room/api.js";
import { BearerSecurityMiddleware } from "./contracts/shared.js";
import {
  MessagingHandlers,
  MessagingIdentity,
} from "./handlers/messaging/messaging.handlers.js";
import { makeMessagingDataLayer } from "./handlers/messaging/messaging.data-layer.js";
import {
  LootlogConfigHandlers,
  LootlogConfigData,
  LootlogConfigAuthorization,
} from "./handlers/lootlog-config/lootlog-config.handlers.js";
import {
  PartyReadyRoomHandlers,
  ReadyRoomAuthorization,
  ReadyRoomData,
  ReadyRoomOperationError,
} from "./handlers/party-ready-room/party-ready-room.handlers.js";

const caller = { userId: "user", discordId: "discord" };
let rateLimited = true;
const database = new Proxy({} as ApiDatabaseValue, {
  get() {
    throw new Error("Rejected input must not access the database");
  },
});
const unused = () => Effect.die("Unexpected ready-room operation");
const services = Layer.mergeAll(
  Layer.succeed(MessagingIdentity, { caller: Effect.succeed(caller) }),
  Layer.succeed(LootlogConfigAuthorization, {
    requireCapability: () => Effect.succeed({ guildId: "guild" }),
  }),
  makeMessagingDataLayer(
    {
      eval: <A>() => Effect.succeed((rateLimited ? [0, 2000] : [1, 0]) as A),
      get: () => Effect.succeed(null),
      set: () => Effect.void,
    },
    { publish: () => Effect.void },
    { create: () => Effect.void },
  ),
  LootlogConfigData.layerDatabase,
  Layer.succeed(ReadyRoomAuthorization, { identity: Effect.succeed(caller) }),
  Layer.succeed(ReadyRoomData, {
    accessibleGuildIds: () => Effect.succeed(["guild"]),
    create: () =>
      Effect.fail(
        new ReadyRoomOperationError({
          cause: new ResourceConflictError({ code: "ACTIVE_GATHERING_EXISTS" }),
        }),
      ),
    get: (_identity, id) =>
      id === "expired"
        ? Effect.fail(
            new ReadyRoomOperationError({
              cause: new ResourceNotFoundError({ code: "ROOM_EXPIRED" }),
            }),
          )
        : Effect.succeed({}),
    cancel: () =>
      Effect.fail(
        new ReadyRoomOperationError({
          cause: new ResourceConflictError({ code: "REVISION_CONFLICT" }),
        }),
      ),
    list: unused,
    apply: unused,
    withdraw: unused,
    remove: unused,
    resolveInvitationTargets: unused,
    observeParty: unused,
  }),
).pipe(Layer.provide(Layer.succeed(ApiDatabase, database)));
const boundary = HttpRouter.toWebHandler(
  HttpApiBuilder.layer(
    HttpApi.make("LootlogApi").add(
      MessagingGroup,
      LootlogConfigGroup,
      PartyReadyRoomGroup,
    ),
  ).pipe(
    Layer.provide(
      Layer.mergeAll(
        MessagingHandlers,
        LootlogConfigHandlers,
        PartyReadyRoomHandlers,
      ),
    ),
    Layer.provide(
      Layer.succeed(BearerSecurityMiddleware, {
        bearer: (effect) =>
          Effect.provideService(effect, ForwardAuthIdentity, caller),
      }),
    ),
    HttpRouter.provideRequest(services),
    Layer.provide(BunHttpServer.layerHttpServices),
  ),
  { disableLogger: true },
);
afterAll(() => boundary.dispose());
const request = (method: string, path: string, body?: unknown) =>
  boundary.handler(
    new Request(`http://api.test${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        authorization: "Bearer forwarded",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  );

it("preserves notification rate-limit status and retry delay through HTTP", async () => {
  rateLimited = true;
  const response = await request("POST", "/messaging", {
    guildIds: ["guild"],
    world: "Fobos",
    message: "test",
  });
  expect(response.status).toBe(429);
  expect(await response.json()).toEqual({
    message: "NOTIFICATION_RATE_LIMITED",
    retryAfterMs: 2000,
  });
});
it("preserves missing notification content as a client error", async () => {
  rateLimited = false;
  const response = await request("POST", "/messaging", {
    guildIds: ["guild"],
    world: "Fobos",
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ message: "MISSING_MESSAGE_OR_NPC" });
});
it("returns 404 for an invalid NPC configuration identifier before database access", async () => {
  const response = await request(
    "PUT",
    "/guilds/guild/lootlog-config/not-a-number",
    { allowedRarities: [] },
  );
  expect(response.status).toBe(404);
});
for (const { method, path, payload, status, code } of [
  {
    method: "POST",
    path: "/messaging/party-gathering",
    payload: {
      guildIds: ["guild"],
      world: "Fobos",
      character: {
        lvl: 100,
        nick: "Hero",
        accountId: "account",
        characterId: "character",
        prof: "w",
        icon: "hero.gif",
      },
    },
    status: 409,
    code: "ACTIVE_GATHERING_EXISTS",
  },
  {
    method: "POST",
    path: "/messaging/party-gathering/active/cancel",
    payload: { expectedRevision: 1 },
    status: 409,
    code: "REVISION_CONFLICT",
  },
  {
    method: "GET",
    path: "/messaging/party-gathering/expired",
    payload: undefined,
    status: 404,
    code: "ROOM_EXPIRED",
  },
]) {
  it(`preserves ready-room ${code} through the HTTP contract`, async () => {
    const response = await request(method, path, payload);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ code });
  });
}
