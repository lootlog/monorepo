import { expect, mock, spyOn, test } from "bun:test";
import { ConfigProvider, Context, Effect, Layer, Result } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { Meilisearch } from "meilisearch";
import { makeItemsModule } from "../src/items/items.service.js";
import type { AppLogger } from "../src/shared/logger.js";
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

const npcHit = {
  id: 1,
  identityNamespace: "template",
  name: "Tanro",
  lvl: 100,
  prof: "w",
  icon: "npc.gif",
  wt: 80,
  type: "HERO",
  margonemType: 2,
  worlds: ["luvia"],
  gameVersion: "pl",
};

const npcDocument = { ...npcHit, uid: "pl_template_1_2", observedLootId: 7 };

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
          const candidate = index === "players" ? player : npcDocument;

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
      ["npcs", "tanro", npcHit],
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

    // Older clients still send `world` to NPC and item search; it is an
    // unknown parameter there and filters only players.
    const items = await boundary.handler(
      new Request("http://localhost/items?search=sword&world=luvia"),
      Context.empty(),
    );

    expect(items.status).toBe(200);
    expect(new Set(queries.map(({ index }) => index))).toEqual(
      new Set(["players", "npcs", "items"]),
    );
    expect(
      queries.filter(
        ({ index, filter }) => index !== "players" && filter !== undefined,
      ),
    ).toEqual([]);

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

for (const scenario of [
  "primary failure",
  "fallback failure",
  "fallback success",
] as const) {
  test(`item search reports only the final failure: ${scenario}`, async () => {
    const terminalError = {
      code: "index_not_found",
      message: "Items index unavailable",
    };

    const staleSettingsError = {
      code: "invalid_search_attributes_to_search_on",
    };

    const queries: { q: string; attributesToSearchOn: string[] }[] = [];
    const error = mock<AppLogger["error"]>(() => {});
    const warn = mock<AppLogger["warn"]>(() => {});

    const client = new Meilisearch({
      host: "http://search.invalid",
      httpClient: async (_input, init) => {
        queries.push(JSON.parse(String(init?.body)));

        if (scenario === "primary failure") throw terminalError;

        if (queries.length === 1) throw staleSettingsError;

        if (scenario === "fallback failure") throw terminalError;

        return { hits: [{ id: 42, name: "Sword" }], totalHits: 8 };
      },
    });

    const items = makeItemsModule(client, { error, warn, info: () => {} });

    const result = await Effect.runPromise(
      items
        .searchItems({ limit: 5, offset: 0, search: "Sword" })
        .pipe(Effect.result),
    );

    expect(queries.map((query) => query.attributesToSearchOn)).toEqual(
      scenario === "primary failure"
        ? [["name", "stat"]]
        : [["name", "stat"], ["name"]],
    );
    expect(queries.every((query) => query.q === "Sword")).toBe(true);
    expect(warn).toHaveBeenCalledTimes(scenario === "primary failure" ? 0 : 1);

    if (scenario === "fallback success") {
      expect(Result.getOrThrow(result)).toMatchObject({
        hits: [{ id: 42, name: "Sword" }],
        estimatedTotalHits: 8,
      });
      expect(error).not.toHaveBeenCalled();
    } else {
      const failure = Result.getOrThrow(Result.flip(result));
      expect(failure).toMatchObject({
        operation:
          scenario === "primary failure"
            ? "search.items"
            : "search.items.fallback",
        cause: { cause: terminalError },
      });
      expect(error).toHaveBeenCalledTimes(1);
      expect(error.mock.calls[0]?.[1]).toEqual({ error: failure });
    }
  });
}
