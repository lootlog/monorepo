import { afterEach, describe, expect, it, vi } from "#test/bun-test";
import type { RedisService } from "#src/redis/redis.service";
import { ReservationCatalogService } from "./reservation-catalog.service.js";

const makeRedis = () =>
  ({
    getOrSetJsonBestEffort: vi.fn(
      async (options: { factory: () => Promise<unknown> }) => options.factory(),
    ),
  }) as unknown as RedisService;

describe("ReservationCatalogService", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches and normalizes the established catalog payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          data: {
            "Titan A": {
              lvl: "120",
              images: ["a.webp"],
              maps: ["map-a"],
            },
            "Titan  A": [
              { lvl: -1, images: "invalid", maps: [] },
              { lvl: 130, images: ["b.webp"], maps: ["map-b"] },
            ],
          },
        }),
      ),
    );

    const spots = await new ReservationCatalogService(makeRedis()).getSpots();

    expect(spots).toEqual([
      {
        id: "titan-a",
        name: "Titan A",
        level: 130,
        images: ["a.webp", "b.webp"],
        maps: ["map-a", "map-b"],
      },
    ]);
  });

  it("fails like the previous HTTP client on a non-success response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    );

    await expect(
      new ReservationCatalogService(makeRedis()).getSpots(),
    ).rejects.toThrow("Reservation catalog request failed: 503");
  });
});
