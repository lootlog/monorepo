import { describe, expect, it, vi } from "#test/bun-test";
import { Effect } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import { makeReservationCatalogAdapter } from "./reservation-catalog.adapter.js";

const makeHttpClient = (status: number, payload: unknown) =>
  ({
    get: () =>
      Effect.succeed({
        status,
        headers: {},
        arrayBuffer: Effect.succeed(
          new TextEncoder().encode(JSON.stringify(payload)).buffer,
        ),
      }),
  }) as unknown as HttpClientValue;

const emptyCache = () => ({
  getJson: <A>() => Effect.succeed(null as A | null),
  setJson: vi.fn(() => Effect.succeed(undefined)),
});

describe("reservation catalog Effect adapter", () => {
  it("fetches, normalizes and caches the established payload", async () => {
    const cache = emptyCache();
    const adapter = makeReservationCatalogAdapter({
      cache,
      httpClient: makeHttpClient(200, {
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
      url: "http://catalog.test/cards",
    });

    expect(await Effect.runPromise(adapter.getSpots)).toEqual([
      {
        id: "titan-a",
        name: "Titan A",
        level: 130,
        images: ["a.webp", "b.webp"],
        maps: ["map-a", "map-b"],
      },
    ]);
    expect(cache.setJson).toHaveBeenCalledTimes(1);
  });

  it("fails closed on a non-success catalog response", async () => {
    const adapter = makeReservationCatalogAdapter({
      cache: emptyCache(),
      httpClient: makeHttpClient(503, null),
      url: "http://catalog.test/cards",
    });

    await expect(Effect.runPromise(adapter.getSpots)).rejects.toThrow(
      "Reservation catalog request failed: 503",
    );
  });
});
