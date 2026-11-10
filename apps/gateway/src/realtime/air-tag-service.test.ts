import { Effect } from "effect";
import { describe, expect, test } from "bun:test";
import { makeGamePingSocket } from "../../test/realtime-fixtures.js";
import { AirTagService } from "./air-tag-service.js";
import { admitConnectionBatch } from "./air-tag-store.js";
import type { SessionData } from "./session.js";

describe("AirTagService", () => {
  test("rejects an empty observation batch before touching Redis", async () => {
    const redisCalls: string[] = [];

    const unexpected = (command: string) => () => {
      redisCalls.push(command);

      return Promise.reject(new Error(`Unexpected Redis ${command}`));
    };

    const service = new AirTagService(
      {
        command: {
          eval: unexpected("eval"),
          mget: unexpected("mget"),
          sadd: unexpected("sadd"),
          smembers: unexpected("smembers"),
          expire: unexpected("expire"),
        },
      },
      {
        instanceId: crypto.randomUUID(),
        getLocalScopes: () => [],
        subscribe: () => {
          throw new Error("Unexpected subscribe");
        },
        unsubscribe: () => {
          throw new Error("Unexpected unsubscribe");
        },
        publishToScopes: () => Promise.reject(new Error("Unexpected publish")),
      },
    );

    expect(
      await Effect.runPromise(
        service.publishObservations(makeGamePingSocket(), {
          expectedMapId: 7,
          observations: [],
        }),
      ),
    ).toEqual({ status: "rejected", code: "invalid-payload" });
    expect(redisCalls).toEqual([]);
  });
});

describe("AirTagService map threats", () => {
  test("publishes a map threat again when the first publication fails", async () => {
    const threatEvent = {
      revision: 300,
      enemies: [{ targetId: "enemy", nickname: "Rival", ageMs: 0 }],
    };

    const evaluations: Array<string | number[]> = [
      [1, 0, 0],
      JSON.stringify({
        epochId: "epoch",
        epochStartedAt: 100,
        revision: 0,
        acceptedTargets: 1,
        targets: [],
        removed: [],
        threat: threatEvent,
        remoteRecipients: true,
      }),
      JSON.stringify({ mapName: "Map", ...threatEvent, revision: 1_300 }),
    ];

    const threatPublications: unknown[] = [];
    let failures = 1;

    const service = new AirTagService(
      {
        command: {
          mget: async (keys: string[]) => keys.map(() => null),
          sadd: async () => 1,
          expire: async () => 1,
          smembers: async () => [],
          eval: async () => {
            const reply = evaluations.shift();

            if (reply === undefined) throw new Error("Unexpected Redis script");

            return reply;
          },
        },
      },
      {
        instanceId: crypto.randomUUID(),
        getLocalScopes: () => [],
        subscribe: () => {},
        unsubscribe: () => {},
        publishToScopes: async (_scopes, event) => {
          if (event.type !== "air-tag.map-threat-updated") return;

          if (failures > 0) {
            failures -= 1;
            throw new Error("Federation unavailable");
          }

          threatPublications.push(event.data);
        },
      },
    );

    const socket = makeGamePingSocket();
    socket.data.airTagScopes = [
      {
        guildId: "organization-1",
        world: "classic",
        mapId: 7,
        subscription: {
          topic: "map.air-tags",
          organizationId: "organization-1",
          world: "classic",
          mapId: 7,
        },
      },
    ];

    await expect(
      Effect.runPromise(
        service.publishObservations(socket, {
          expectedMapId: 7,
          observations: [
            {
              targetId: "enemy",
              nickname: "Rival",
              clan: { id: 5, name: "Rivals" },
              relation: 6,
              x: 1,
              y: 2,
            },
          ],
        }),
      ),
    ).resolves.toMatchObject({ status: "accepted" });
    expect(threatPublications).toHaveLength(0);

    await Bun.sleep(1_100);

    expect(threatPublications).toEqual([
      expect.objectContaining({ mapId: 7, mapName: "Map", revision: 1_300 }),
    ]);
  });
});

describe("air-tag connection batch admission", () => {
  const session = (): Pick<SessionData, "airTagBatchesSentAt"> => ({});

  test("admits the window's batches, then rejects until the oldest one ages out", () => {
    const connection = session();
    const startedAt = 1_000_000;

    for (let index = 0; index < 15; index += 1) {
      expect(admitConnectionBatch(connection, startedAt + index)).toEqual({
        admitted: true,
      });
    }

    // The 16th batch inside the window waits for the first one to leave it.
    expect(admitConnectionBatch(connection, startedAt + 15)).toEqual({
      admitted: false,
      retryAfterMs: 2_985,
    });

    // Once it has, the connection publishes again rather than staying stuck.
    expect(admitConnectionBatch(connection, startedAt + 3_000)).toEqual({
      admitted: true,
    });
  });
});
