import { Permissions } from "#src/activities/activity-permissions";
import { ActivityRepository } from "#src/activities/activity-repository";
import { ActivityReadiness, ActivityRoutes } from "#src/http/activity-http";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { TestClock } from "effect/testing";
import {
  checkpoint,
  startOnlineRepositoryHarness,
  type OnlineRepositoryHarness,
} from "./online-repository.integration.fixtures.js";
import { OnlineRepository } from "./online-repository.js";

describe("durable private online history", () => {
  let harness: OnlineRepositoryHarness;

  beforeAll(async () => {
    harness = await startOnlineRepositoryHarness();
  }, 60_000);

  afterAll(async () => {
    await harness?.stop();
  });

  it("unions parallel sessions, retries and out-of-order cumulative checkpoints without filling gaps", async () => {
    const result = await harness.run(
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;

        const initial = yield* repo.find("never", {
          from: "2026-09-01",
          to: "2026-09-01",
        });

        expect(initial.status).toBe("unavailable");
        yield* repo.ingest({
          version: 1,
          type: "collector",
          status: "healthy",
          observedAt: "2025-10-25T00:00:00Z",
        });

        const first = checkpoint(
          "union",
          "a",
          "2026-09-01T08:00:00Z",
          "2026-09-01T09:00:00Z",
        );

        yield* repo.ingest(first);
        yield* repo.ingest({
          ...first,
          endedAt: "2026-09-01T10:00:00Z",
          observedAt: "2026-09-01T10:00:00Z",
        });
        yield* Effect.all([repo.ingest(first), repo.ingest(first)], {
          concurrency: "unbounded",
        });
        yield* repo.ingest(
          checkpoint(
            "union",
            "b",
            "2026-09-01T09:00:00Z",
            "2026-09-01T11:00:00Z",
          ),
        );
        yield* repo.ingest(
          checkpoint(
            "union",
            "c",
            "2026-09-01T12:00:00Z",
            "2026-09-01T13:00:00Z",
          ),
        );
        yield* repo.ingest(
          checkpoint(
            "different-user",
            "a",
            "2026-09-01T00:00:00Z",
            "2026-09-01T20:00:00Z",
          ),
        );

        return yield* repo.find("union", {
          from: "2026-08-31",
          to: "2026-09-02",
        });
      }),
    );

    expect(result.days).toEqual([
      {
        date: "2026-08-31",
        onlineSeconds: 0,
        partial: false,
        worlds: [],
        worldsComplete: true,
      },
      {
        date: "2026-09-01",
        onlineSeconds: 14_400,
        partial: false,
        worlds: [],
        worldsComplete: false,
      },
      {
        date: "2026-09-02",
        onlineSeconds: 0,
        partial: false,
        worlds: [],
        worldsComplete: true,
      },
    ]);
    expect(result.trackingStartedAt).toBe("2025-10-25T00:00:00.000Z");
  });

  it("keeps dates before instrumentation and the partially observed first day unknown", async () => {
    const result = await harness.runAt(
      "2025-10-27T12:00:00Z",
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;

        return yield* repo.find("never-played", {
          from: "2025-10-24",
          to: "2025-10-26",
        });
      }),
    );

    expect(result.days).toEqual([
      {
        date: "2025-10-24",
        onlineSeconds: null,
        partial: false,
        worlds: [],
        worldsComplete: true,
      },
      {
        date: "2025-10-25",
        onlineSeconds: null,
        partial: true,
        worlds: [],
        worldsComplete: true,
      },
      {
        date: "2025-10-26",
        onlineSeconds: 0,
        partial: false,
        worlds: [],
        worldsComplete: true,
      },
    ]);

    const confirmed = await harness.runAt(
      "2025-10-27T12:00:00Z",
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;
        yield* repo.ingest(
          checkpoint(
            "deployment-day",
            "a",
            "2025-10-25T08:00:00Z",
            "2025-10-25T09:00:00Z",
          ),
        );

        return yield* repo.find("deployment-day", {
          from: "2025-10-25",
          to: "2025-10-25",
        });
      }),
    );

    expect(confirmed.days[0]).toEqual({
      date: "2025-10-25",
      onlineSeconds: 3600,
      partial: true,
      worlds: [],
      worldsComplete: false,
    });
    expect(result.lastObservedAt).toBeNull();
    expect(result.status).toBe("stale");
  });

  it.each([
    [
      "spring",
      "2026-03-30T12:00:00Z",
      "2026-03-28T23:00:00Z",
      "2026-03-29T22:00:00Z",
      "2026-03-29",
      23 * 3600,
    ],
    [
      "autumn",
      "2025-10-27T12:00:00Z",
      "2025-10-25T22:00:00Z",
      "2025-10-26T23:00:00Z",
      "2025-10-26",
      25 * 3600,
    ],
  ] as const)(
    "splits Warsaw midnight for %s DST",
    async (user, now, start, end, date, seconds) => {
      const result = await harness.runAt(
        now,
        Effect.gen(function* () {
          const repo = yield* OnlineRepository;
          yield* repo.ingest(checkpoint(user, "a", start, end));

          return yield* repo.find(user, { from: date, to: date });
        }),
      );

      expect(result.days[0]?.onlineSeconds).toBe(seconds);
    },
  );

  it("keeps offline users fresh from a healthy collector and does not replace degraded with older health", async () => {
    const result = await harness.run(
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;
        const observedAt = new Date().toISOString();
        yield* repo.ingest({
          version: 1,
          type: "collector",
          status: "healthy",
          observedAt,
        });

        const fresh = yield* repo.find("union", {
          from: "2026-09-01",
          to: "2026-09-01",
        });

        yield* repo.ingest({
          version: 1,
          type: "collector",
          status: "degraded",
          observedAt,
        });
        yield* repo.ingest({
          version: 1,
          type: "collector",
          status: "healthy",
          observedAt,
        });

        const stale = yield* repo.find("union", {
          from: "2026-09-01",
          to: "2026-09-01",
        });

        const unavailable = yield* repo.find("never", {
          from: "2026-09-01",
          to: "2026-09-01",
        });

        return { fresh, stale, unavailable };
      }),
    );

    expect(result.fresh.status).toBe("fresh");
    expect(result.stale.status).toBe("stale");
    expect(result.unavailable.status).toBe("stale");
    expect(result.unavailable.days[0]?.onlineSeconds).toBe(0);
  });

  it("persists a degraded gateway lease across newer healthy peers and repository restarts", async () => {
    const now = Date.now();

    const first = await harness.run(
      Effect.gen(function* () {
        yield* TestClock.setTime(now);
        const repo = yield* OnlineRepository;
        yield* repo.ingest({
          version: 1,
          type: "collector",
          status: "degraded",
          observedAt: new Date(now).toISOString(),
        });
        yield* repo.ingest({
          version: 1,
          type: "collector",
          status: "healthy",
          observedAt: new Date(now + 1000).toISOString(),
        });

        return yield* repo.find("union", {
          from: "2026-09-01",
          to: "2026-09-01",
        });
      }).pipe(Effect.provide(TestClock.layer())),
    );

    expect(first.status).toBe("stale");

    const beforeExpiry = await harness.run(
      Effect.gen(function* () {
        yield* TestClock.setTime(now + 179_000);
        const repo = yield* OnlineRepository;

        return yield* repo.find("union", {
          from: "2026-09-01",
          to: "2026-09-01",
        });
      }).pipe(Effect.provide(TestClock.layer())),
    );

    expect(beforeExpiry.status).toBe("stale");

    const recovered = await harness.run(
      Effect.gen(function* () {
        yield* TestClock.setTime(now + 180_000);
        const repo = yield* OnlineRepository;
        yield* repo.ingest({
          version: 1,
          type: "collector",
          status: "healthy",
          observedAt: new Date(now + 180_000).toISOString(),
        });

        return yield* repo.find("union", {
          from: "2026-09-01",
          to: "2026-09-01",
        });
      }).pipe(Effect.provide(TestClock.layer())),
    );

    expect(recovered.status).toBe("fresh");
  });

  it("serves only the authenticated internal user and rejects missing identity and invalid date ranges", async () => {
    const routes = ActivityRoutes.pipe(
      Layer.provideMerge(
        OnlineRepository.layer.pipe(Layer.provideMerge(harness.database)),
      ),
      Layer.provideMerge(
        Layer.succeed(ActivityReadiness, {
          check: Effect.die("unused readiness"),
        }),
      ),
      Layer.provideMerge(
        Layer.succeed(ActivityRepository, {
          create: () => Effect.die("unused"),
          clearActiveSessionsForMember: () => Effect.die("unused"),
          findMany: () => Effect.die("unused"),
          findOne: () => Effect.die("unused"),
          deleteOne: () => Effect.die("unused"),
          memberStats: () => Effect.die("unused"),
          suggestActorNames: () => Effect.die("unused"),
          suggestWorlds: () => Effect.die("unused"),
          suggestClanNames: () => Effect.die("unused"),
        }),
      ),
      Layer.provideMerge(
        Layer.succeed(Permissions, {
          resolveGuildId: () => Effect.die("unused"),
          getUserCapabilities: () => Effect.die("unused"),
        }),
      ),
      Layer.provideMerge(HttpServer.layerServices),
    );

    const boundary = HttpRouter.toWebHandler(routes, { disableLogger: true });

    const url =
      "https://activity/users/@me/activity/online?from=2026-09-01&to=2026-09-01";

    try {
      expect((await boundary.handler(new Request(url))).status).toBe(401);

      const headers = {
        authorization: "Bearer forwarded",
        "x-auth-user-id": "union",
        "x-auth-discord-id": "union-discord",
      };

      const response = await boundary.handler(
        new Request(url + "&userId=different-user", { headers }),
      );

      expect(response.status).toBe(200);
      expect((await response.json()).days[0].onlineSeconds).toBe(14_400);
      expect(
        (
          await boundary.handler(
            new Request(url.replace("@me", "different-user"), { headers }),
          )
        ).status,
      ).toBe(404);
      expect(
        (
          await boundary.handler(
            new Request(url.replace("2026-09-01&to", "2026-02-30&to"), {
              headers,
            }),
          )
        ).status,
      ).toBe(400);
    } finally {
      await boundary.dispose();
    }
  });
});
