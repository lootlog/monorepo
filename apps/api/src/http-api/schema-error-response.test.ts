import {
  SchemaErrorResponse,
  SchemaErrorResponseLive,
} from "./schema-error-response.js";
import { afterAll, expect, it } from "bun:test";
import { BunHttpServer } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/unstable/http";
import { HttpApi, HttpApiBuilder, HttpApiGroup } from "effect/unstable/httpapi";
import { TimersGroup } from "./contracts/timers/api.js";
import { MessagingGroup } from "./contracts/messaging/api.js";
import { LootsGroup } from "./contracts/loots/api.js";
import { BearerSecurityMiddleware } from "./contracts/shared.js";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";

const group = HttpApiGroup.make("validation").add(
  TimersGroup.endpoints.TimersControllerCreateAutoTimer,
  MessagingGroup.endpoints.MessagingControllerSendNotification,
  LootsGroup.endpoints.LootsControllerCreateLoot,
);

const api = HttpApi.make("ValidationTest")
  .add(group)
  .middleware(SchemaErrorResponse);

let handlerCalls = 0;

const accepted = () => {
  handlerCalls += 1;

  return Effect.succeed(HttpServerResponse.empty({ status: 204 }));
};

const boundary = HttpRouter.toWebHandler(
  HttpApiBuilder.layer(api).pipe(
    Layer.provide(
      HttpApiBuilder.group(api, "validation", (handlers) =>
        handlers
          .handle("TimersControllerCreateAutoTimer", accepted)
          .handle("MessagingControllerSendNotification", accepted)
          .handle("LootsControllerCreateLoot", accepted),
      ),
    ),
    Layer.provide(
      Layer.succeed(BearerSecurityMiddleware, {
        bearer: (effect) =>
          Effect.provideService(effect, ForwardAuthIdentity, {
            userId: "user",
            discordId: "discord",
          }),
      }),
    ),
    Layer.provide(BunHttpServer.layerHttpServices),
    Layer.provide(SchemaErrorResponseLive),
  ),
  { disableLogger: true },
);

afterAll(() => boundary.dispose());

const npc = {
  id: 185508,
  name: "Chopesz",
  prof: "b",
  wt: 27,
  hpp: 0,
  type: 2,
  lvl: 272,
  icon: "e2/chopesh2.gif",
};

for (const { path, payload, field } of [
  {
    path: "/timers/auto",
    payload: {
      respBaseSeconds: 561,
      world: "luvia",
      npc,
      characterId: "220",
      accountId: "9822301",
    },
    field: "npc.location",
  },
  {
    path: "/messaging",
    payload: {
      world: "luvia",
      guildIds: ["guild"],
      npc: { ...npc, location: "" },
    },
    field: "npc.location",
  },
  {
    path: "/loots",
    payload: {
      world: "luvia",
      source: "FIGHT",
      npcs: [{ ...npc, location: "" }],
      loots: [
        {
          id: 1,
          hid: "item",
          name: "Loot",
          icon: "loot.gif",
          pr: 1,
          prc: "zl",
          stat: "lvl=1",
          cl: 1,
        },
      ],
      players: [
        {
          id: 220,
          accountId: 9822301,
          name: "Player",
          lvl: 302,
          prof: "p",
          icon: "player.gif",
        },
      ],
      characterId: "220",
      accountId: "9822301",
    },
    field: "npcs.0.location",
  },
]) {
  it(`explains rejected ${path} fields before calling its handler`, async () => {
    const previousCalls = handlerCalls;

    const response = await boundary.handler(
      new Request(`http://api.test${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer forwarded",
        },
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "VALIDATION_ERROR",
      message: expect.stringContaining(field),
    });
    expect(handlerCalls).toBe(previousCalls);
  });
}

it("keeps valid timer requests executable", async () => {
  const previousCalls = handlerCalls;

  const response = await boundary.handler(
    new Request("http://api.test/timers/auto", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer forwarded",
      },
      body: JSON.stringify({
        respBaseSeconds: 561,
        world: "luvia",
        npc: { ...npc, location: "Tomb" },
        characterId: "220",
        accountId: "9822301",
      }),
    }),
  );

  expect(response.status).toBe(204);
  expect(handlerCalls).toBe(previousCalls + 1);
});

it("explains invalid values without echoing submitted private data", async () => {
  const response = await boundary.handler(
    new Request("http://api.test/messaging", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer forwarded",
      },
      body: JSON.stringify({
        world: { token: "private-value-do-not-echo" },
        guildIds: ["guild"],
        message: "notification",
      }),
    }),
  );

  expect(response.status).toBe(400);
  const body = await response.text();
  expect(body).toContain("world");
  expect(body).toContain("Expected string");
  expect(body).not.toContain("private-value-do-not-echo");
});
