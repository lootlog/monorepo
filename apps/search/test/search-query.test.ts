import { expect, spyOn, test } from "bun:test";
import { ConfigProvider, Context, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
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

const npc = {
  id: 1,
  name: "Tanro",
  lvl: 100,
  prof: "w",
  icon: "npc.gif",
  wt: 80,
  type: "HERO",
  margonemType: 2,
  world: "luvia",
};

test("individual endpoints preserve text search and repeated exact-name filters through HTTP", async () => {
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
          const candidate = index === "players" ? player : npc;

          const hits =
            index !== "items" &&
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
    for (const [index, term, expected] of [
      ["players", "cash", player],
      ["npcs", "tanro", npc],
    ] as const) {
      const individual = await boundary.handler(
        new Request(`http://localhost/${index}?search=${term}&world=luvia`),
        Context.empty(),
      );

      expect(individual.status).toBe(200);
      expect(await individual.json()).toEqual([expected]);

      const all = await boundary.handler(
        new Request(`http://localhost/all?search=${term}&world=luvia`),
        Context.empty(),
      );

      expect(all.status).toBe(200);
      expect(await all.json()).toMatchObject({ [index]: [expected] });
    }

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
  } finally {
    await boundary.dispose();
    fetch.mockRestore();
  }
});
