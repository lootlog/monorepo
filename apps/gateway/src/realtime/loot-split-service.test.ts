import { Effect } from "effect";
import { describe, expect, test } from "bun:test";
import {
  acceptingRateLimit,
  makeGamePingSocket as makeSocket,
} from "../../test/realtime-fixtures.js";
import { LootSplitService } from "./loot-split-service.js";

describe("LootSplitService", () => {
  test("routes choices to the split's other participants on the sender's world, whatever their map", async () => {
    const publications: unknown[] = [];
    const rateLimitKeys: string[] = [];

    const service = new LootSplitService(
      acceptingRateLimit(1234, rateLimitKeys),
      {
        publishToScopes: async (...arguments_: unknown[]) => {
          publications.push(arguments_);
        },
      },
    );

    const response = await Effect.runPromise(
      service.send(makeSocket(), {
        splitId: "1200653658",
        choices: { "1200653658": 0, "1200653660": 2 },
        accepted: true,
        recipientCharacterIds: ["123", "789", "1466"],
      }),
    );

    expect(response).toEqual({ status: "accepted" });
    // Loot split frames must not drain the map or battle ping budgets.
    expect(rateLimitKeys).toEqual(["loot-split:rate:user-1"]);
    expect(publications).toEqual([
      [
        [
          {
            topic: "map.pings",
            organizationId: "organization-1",
            world: "classic",
          },
        ],
        {
          v: 1,
          type: "loot-split.received",
          data: {
            splitId: "1200653658",
            world: "classic",
            sender: { characterId: "123", name: "Hero" },
            choices: { "1200653658": 0, "1200653660": 2 },
            accepted: true,
            sentAt: 1234,
          },
        },
        {
          excludeConnectionId: "connection-1",
          recipientPlatform: "game",
          recipientWorld: "classic",
          recipientCharacterIds: ["789", "1466"],
        },
      ],
    ]);
  });

  test("routes a loot filter accept to the fight's other players without naming a split", async () => {
    const publications: unknown[] = [];

    const service = new LootSplitService(acceptingRateLimit(), {
      publishToScopes: async (...arguments_: unknown[]) => {
        publications.push(arguments_);
      },
    });

    const response = await Effect.runPromise(
      service.autoAccept(makeSocket(), {
        recipientCharacterIds: ["123", "16051"],
      }),
    );

    expect(response).toEqual({ status: "accepted" });
    expect(publications).toEqual([
      [
        [
          {
            topic: "map.pings",
            organizationId: "organization-1",
            world: "classic",
          },
        ],
        {
          v: 1,
          type: "loot-split.auto-accepted",
          data: {
            world: "classic",
            sender: { characterId: "123", name: "Hero" },
            sentAt: 1234,
          },
        },
        {
          excludeConnectionId: "connection-1",
          recipientPlatform: "game",
          recipientWorld: "classic",
          recipientCharacterIds: ["16051"],
        },
      ],
    ]);
  });

  test("rejects a sender that shows itself in no Lootlog without consuming the rate limit", async () => {
    const rateLimitKeys: string[] = [];
    const socket = makeSocket();

    const service = new LootSplitService(
      acceptingRateLimit(1234, rateLimitKeys),
      {
        publishToScopes: () => Promise.reject(new Error("Unexpected publish")),
      },
    );

    const hidden = {
      ...socket,
      data: {
        ...socket.data,
        presence: socket.data.presence && {
          ...socket.data.presence,
          organizationIds: [],
        },
      },
    };

    expect(
      await Effect.runPromise(
        service.send(hidden, {
          splitId: "1200653658",
          choices: { "1200653658": 1 },
          accepted: false,
          recipientCharacterIds: ["789"],
        }),
      ),
    ).toEqual({ status: "rejected", code: "forbidden" });
    expect(rateLimitKeys).toEqual([]);
  });

  test("rejects choices keyed by something other than an item id", async () => {
    const service = new LootSplitService(acceptingRateLimit(), {
      publishToScopes: () => Promise.reject(new Error("Unexpected publish")),
    });

    expect(
      await Effect.runPromise(
        service.send(makeSocket(), {
          splitId: "1200653658",
          choices: { "<script>": 1 },
          accepted: false,
          recipientCharacterIds: ["789"],
        }),
      ),
    ).toEqual({ status: "rejected", code: "invalid-payload" });
  });
});
