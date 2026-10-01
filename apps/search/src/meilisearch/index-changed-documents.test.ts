import { expect, test } from "bun:test";
import { Effect, Schema } from "effect";
import { Meilisearch, type SearchParams } from "meilisearch";
import { uniqBy } from "es-toolkit";
import { NpcTypeEnum } from "@lootlog/schema/npc-type";
import { makePlayersModule } from "../players/players.service.js";
import { makeNpcsModule, type toNpcDocument } from "../npcs/npcs.service.js";
import { makeItemsModule } from "../items/items.service.js";
import { IndexNpcsPayload } from "../npcs/index-npcs-command.js";

const logger = { info() {}, warn() {}, error() {} };

test("NPC observations are one catalog entry per edition and identity, with every world", async () => {
  type Document = ReturnType<typeof toNpcDocument>;

  const stored = new Map<string, Document>();

  const client = new Meilisearch({
    host: "http://search.invalid",
    httpClient: (input, init) => {
      const url = new URL(String(input));

      if (url.pathname.startsWith("/tasks/"))
        return Promise.resolve({ uid: 1, status: "succeeded" });

      if (url.pathname.endsWith("/search")) {
        const query: SearchParams = JSON.parse(String(init?.body));
        const documents = [...stored.values()];

        const matches =
          query.distinct === "catalogKey"
            ? uniqBy(documents, (document) => document.catalogKey)
            : documents;

        return Promise.resolve({ hits: matches.slice(0, query.limit) });
      }

      if ((init?.method ?? "GET").toUpperCase() === "GET") {
        const ids = (url.searchParams.get("ids") ?? "").split(",");

        return Promise.resolve({
          results: ids.flatMap((id) =>
            stored.has(id) ? [stored.get(id)] : [],
          ),
        });
      }

      const documents: Document[] = JSON.parse(String(init?.body));

      for (const document of documents) stored.set(document.uid, document);

      return Promise.resolve({ taskUid: 1, status: "enqueued" });
    },
  });

  const npcs = makeNpcsModule(client, logger);

  const champion = {
    id: 52950,
    name: "Czempion Furboli",
    world: "tarhuna",
    icon: "reworked.gif",
    prof: "w",
    lvl: 210,
    wt: 20,
    // The accepted classification survives changes to the local wt classifier.
    type: NpcTypeEnum.HERO,
    margonemType: 2,
    gameVersion: "pl",
    snapshotHash: "observed-210",
  } as const;

  const index = (observations: typeof IndexNpcsPayload.Type) =>
    Effect.runPromise(
      npcs.indexNpcs({
        npcs: Schema.decodeUnknownSync(IndexNpcsPayload)(observations),
      }),
    );

  // The same NPC on other worlds of the edition, delivered separately and
  // again, including from a publisher that sent no edition.
  await index([champion, { ...champion, world: "fobos" }]);
  await index([champion]);

  const { gameVersion: _gameVersion, ...unversioned } = champion;
  await index([{ ...unversioned, world: "jaruna" }]);

  expect([...stored.keys()]).toEqual(["pl_52950_2"]);

  const hits = await Effect.runPromise(npcs.getNpcs({ limit: 10 }));

  expect(hits).toEqual([
    expect.objectContaining({
      id: 52950,
      gameVersion: "pl",
      worlds: ["fobos", "jaruna", "tarhuna"],
    }),
  ]);

  // Editions never share an entry: an English world is another NPC, even
  // with an equal id, name and type.
  await index([{ ...unversioned, world: "cronus" }]);

  expect(
    (await Effect.runPromise(npcs.getNpcs({ limit: 10 }))).map((hit) => [
      hit.gameVersion,
      hit.worlds,
    ]),
  ).toEqual([
    ["pl", ["fobos", "jaruna", "tarhuna"]],
    ["en", ["cronus"]],
  ]);

  // Explicit identities: the same number in another namespace is another NPC,
  // and a template suggestion replaces the legacy one for the same monster.
  await index([
    { ...champion, identityNamespace: "template" },
    { ...champion, name: "Unrelated spawn", identityNamespace: "runtime" },
  ]);

  const byId = await Effect.runPromise(
    npcs.getNpcs({ limit: 10, ids: [52950] }),
  );

  // The fake search ignores the id filter.
  expect(
    byId
      .filter((hit) => hit.gameVersion === "pl")
      .map((hit) => [hit.identityNamespace, hit.name]),
  ).toEqual([
    ["legacy", "Czempion Furboli"],
    ["template", "Czempion Furboli"],
    ["runtime", "Unrelated spawn"],
  ]);

  const suggestions = await Effect.runPromise(npcs.getNpcs({ limit: 10 }));

  expect(
    suggestions
      .filter((hit) => hit.name === "Czempion Furboli")
      .map((hit) => [hit.gameVersion, hit.identityNamespace]),
  ).toEqual([
    ["pl", "template"],
    ["en", "legacy"],
  ]);
});

for (const catalog of ["players", "npcs", "items"] as const) {
  test(`${catalog} skips redelivery, keeps latest duplicate and reindexes changes`, async () => {
    const stored = new Map<string, { uid: string }>();
    const writes: unknown[][] = [];

    const client = new Meilisearch({
      host: "http://search.invalid",
      httpClient: (input, init) => {
        const url = new URL(String(input));

        if (url.pathname.startsWith("/tasks/"))
          return Promise.resolve({ uid: 1, status: "succeeded" });

        if ((init?.method ?? "GET").toUpperCase() === "GET") {
          const ids = (url.searchParams.get("ids") ?? "").split(",");

          return Promise.resolve({
            results: ids.flatMap((id) =>
              stored.has(id) ? [stored.get(id)] : [],
            ),
          });
        }

        const documents: { uid: string }[] = JSON.parse(String(init?.body));
        writes.push(documents);

        for (const document of documents) stored.set(document.uid, document);

        return Promise.resolve({ taskUid: 1, status: "enqueued" });
      },
    });

    const index = (levels: number[]) => {
      const common = {
        name: "Name",
        world: "test",
        icon: "icon.gif",
        prof: "w",
      };

      if (catalog === "players")
        return makePlayersModule(client, logger).indexPlayers({
          players: levels.map((lvl) => ({
            ...common,
            id: "1",
            accountId: 1,
            characterId: 1,
            lvl,
          })),
        });

      if (catalog === "npcs")
        return makeNpcsModule(client, logger).indexNpcs({
          npcs: levels.map((lvl) => ({
            ...common,
            id: 1,
            lvl,
            wt: 80,
            margonemType: 2,
            type: "hero",
          })),
        });

      return makeItemsModule(client, logger).indexItems({
        items: levels.map((lvl) => ({
          id: 1,
          name: common.name,
          world: common.world,
          icon: common.icon,
          lvl,
          stat: "lvl=1",
          rarity: null,
          type: null,
        })),
      });
    };

    await Effect.runPromise(index([1, 2]));
    expect(writes).toEqual([[expect.objectContaining({ lvl: 2 })]]);
    await Effect.runPromise(index([2]));
    expect(writes).toHaveLength(1);
    await Effect.runPromise(index([3]));
    expect(writes).toHaveLength(2);
    expect(writes[1]).toEqual([expect.objectContaining({ lvl: 3 })]);
  });
}

test("bounds writes to 500 documents and retries only the failed chunk", async () => {
  const readSizes: number[] = [];
  const writeSizes: number[] = [];
  const stored = new Map<string, { uid: string }>();

  const client = new Meilisearch({
    host: "http://search.invalid",
    httpClient: (input, init) => {
      const url = new URL(String(input));

      if (url.pathname.startsWith("/tasks/"))
        return Promise.resolve({
          uid: writeSizes.length,
          status: writeSizes.length === 2 ? "failed" : "succeeded",
        });

      if ((init?.method ?? "GET").toUpperCase() === "GET") {
        const ids = (url.searchParams.get("ids") ?? "").split(",");
        readSizes.push(ids.length);

        return Promise.resolve({
          results: ids.flatMap((id) =>
            stored.has(id) ? [stored.get(id)] : [],
          ),
        });
      }

      const documents: { uid: string }[] = JSON.parse(String(init?.body));
      writeSizes.push(documents.length);

      if (writeSizes.length !== 2) {
        for (const document of documents) stored.set(document.uid, document);
      }

      return Promise.resolve({
        taskUid: writeSizes.length,
        status: "enqueued",
      });
    },
  });

  const index = makePlayersModule(client, logger).indexPlayers({
    players: Array.from({ length: 501 }, (_, id) => ({
      id: String(id + 1),
      name: "Player",
      world: "test",
      icon: "icon.gif",
      prof: "w",
      lvl: 1,
      accountId: 1,
      characterId: id + 1,
    })),
  });

  const failure = await Effect.runPromise(index.pipe(Effect.flip));

  expect(failure._tag).toBe("SearchOperationFailure");
  expect(readSizes).toEqual([100, 100, 100, 100, 100, 1]);
  expect(writeSizes).toEqual([500, 1]);
  expect(stored.size).toBe(500);
  await Effect.runPromise(index);
  expect(writeSizes).toEqual([500, 1, 1]);
  expect(stored.size).toBe(501);
});
