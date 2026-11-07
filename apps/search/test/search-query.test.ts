import { expect, spyOn, test } from "bun:test";
import { ConfigProvider, Context, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { SearchOperations } from "../src/http-api/search-operations.js";
import { SearchRoutes } from "../src/http-api/search-http.js";

const player = {
  id: "2209822301",
  name: "cashtelan",
  lvl: 302,
  prof: "PALADIN",
  icon: "icon.gif",
  characterId: 220,
  accountId: 9822301,
  world: "luvia",
};

test("player search preserves text search and repeated exact-name filters through HTTP", async () => {
  const queries: { index: string; q: string; filter?: string }[] = [];

  const fetch = spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(
      async (
        input: Parameters<typeof globalThis.fetch>[0],
        init?: Parameters<typeof globalThis.fetch>[1],
      ) => {
        const path = new URL(String(input)).pathname;

        if (path.endsWith("/search")) {
          const query: { q: string; filter?: string } = JSON.parse(
            String(init?.body),
          );

          const index = path.split("/")[2] ?? "";
          queries.push({ index, ...query });
          const candidate = player;

          const hits =
            query.q &&
            candidate.name.toLowerCase().includes(query.q.toLowerCase())
              ? [candidate]
              : [];

          return Response.json({ hits, estimatedTotalHits: hits.length });
        }

        if (path.startsWith("/tasks/"))
          return Response.json({ uid: 1, status: "succeeded" });

        if (init?.method === "PATCH")
          return Response.json({ taskUid: 1, status: "enqueued" });

        return Response.json({});
      },
      { preconnect: globalThis.fetch.preconnect },
    ),
  );

  const operations = SearchOperations.layer.pipe(
    Layer.provide(
      ConfigProvider.layer(
        ConfigProvider.fromEnvRecord({
          PORT: "0",
          MEILISEARCH_HOST: "http://meili.invalid",
          MEILISEARCH_API_KEY: "test",
          RABBITMQ_URI: "amqp://unused",
        }),
      ),
    ),
  );

  const boundary = HttpRouter.toWebHandler(
    SearchRoutes.pipe(
      HttpRouter.provideRequest(operations),
      Layer.provide(HttpServer.layerServices),
    ),
    { disableLogger: true },
  );

  try {
    const individual = await boundary.handler(
      new Request("http://localhost/players?search=cash&world=luvia"),
      Context.empty(),
    );

    expect(individual.status).toBe(200);
    expect(await individual.json()).toEqual([player]);

    queries.length = 0;

    const exact = await boundary.handler(
      new Request(
        "http://localhost/players?search=cashtelan&search=Other&world=luvia",
      ),
      Context.empty(),
    );

    expect(exact.status).toBe(200);
    expect(queries).toEqual([
      expect.objectContaining({
        index: "players",
        q: "",
        filter: 'name IN ["cashtelan", "Other"] AND world = "luvia"',
      }),
    ]);

    {
      for (const [world, expectedFilter] of [
        [
          'luvia" OR world = "berufs',
          String.raw`world = "luvia\" OR world = \"berufs"`,
        ],
        [String.raw`luvia\test`, String.raw`world = "luvia\\test"`],
      ] as const) {
        queries.length = 0;
        const params = new URLSearchParams({ search: "cash", world });

        const response = await boundary.handler(
          new Request(`http://localhost/players?${params}`),
          Context.empty(),
        );

        expect(response.status).toBe(200);
        expect(queries.filter(({ index }) => index === "players")).toEqual([
          expect.objectContaining({ q: "cash", filter: expectedFilter }),
        ]);
      }
    }
  } finally {
    await boundary.dispose();
    fetch.mockRestore();
  }
});
