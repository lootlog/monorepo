import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { makePostgresLayer } from "@lootlog/database";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { Effect, Layer, ManagedRuntime, Redacted } from "effect";
import pg from "pg";
import type { ObservedGameFact } from "@lootlog/game-facts/facts";
import { CatalogDatabase } from "#src/database/database";
import { migrateCatalogDatabase } from "#src/database/migrate";
import { type FactsModule, makeFactsModule } from "#src/facts/facts.service";
import type { CatalogFactSubmissionRequest } from "#src/http-api/contracts/facts/schemas";
import type { CatalogCaller } from "#src/shared/catalog-caller";

let postgres: StartedPostgreSqlContainer;

let pool: pg.Pool;

let runtime: ManagedRuntime.ManagedRuntime<CatalogDatabase, unknown>;

const moderator: CatalogCaller = {
  userId: "moderator",
  roles: ["wiki-moderator"],
};

beforeAll(async () => {
  postgres = await new PostgreSqlContainer("postgres:18.7-alpine")
    .withDatabase("catalog")
    .withUsername("lootlog")
    .withPassword("lootlog")
    .withStartupTimeout(60_000)
    .start();
  pool = new pg.Pool({ connectionString: postgres.getConnectionUri() });

  const postgresLayer = makePostgresLayer({
    url: Redacted.make(postgres.getConnectionUri()),
  });

  await Effect.runPromise(
    migrateCatalogDatabase.pipe(Effect.provide(postgresLayer)),
  );
  runtime = ManagedRuntime.make(
    CatalogDatabase.layer.pipe(Layer.provide(postgresLayer)),
  );
}, 90_000);

afterAll(async () => {
  await runtime?.dispose();
  await pool?.end();
  await postgres?.stop();
});

beforeEach(async () => {
  await pool.query(
    `TRUNCATE "CatalogFactObservation", "CatalogFact", "CatalogFactSubmission"`,
  );
});

const facts = <A>(run: (module: FactsModule) => Effect.Effect<A, unknown>) =>
  runtime.runPromise(
    Effect.gen(function* () {
      return yield* run(makeFactsModule(yield* CatalogDatabase));
    }),
  );

const shop = (price: number, observedAt: string): ObservedGameFact => ({
  observedAt,
  fact: {
    kind: "SHOP",
    shopId: 1046,
    npcId: 66,
    currency: "zl",
    buyBackPercent: 75,
    offers: [{ itemId: 33610, price, quantity: 1 }],
  },
});

const map: ObservedGameFact = {
  observedAt: "2026-11-25T05:00:00.000Z",
  fact: {
    kind: "MAP",
    mapId: 1,
    parentMapId: 1,
    name: "Ithan",
    file: "ithan.8.png",
    background: null,
    pvp: 0,
    minLevel: null,
    maxLevel: null,
    respawnMapName: "Ithan",
  },
};

const submission = (
  key: string,
  observed: ReadonlyArray<ObservedGameFact>,
): CatalogFactSubmissionRequest => ({
  submissionKey: key.repeat(64),
  source: "RECORDING",
  gameVersion: "pl",
  world: "gordion",
  extractorVersion: 1,
  facts: observed,
});

test("a recording is saved once and later recordings replace only what they observed later", async () => {
  const first = submission("a", [shop(100, "2026-11-25T05:00:00.000Z"), map]);

  expect(
    (await facts((module) => module.preview(moderator, first))).facts.map(
      ({ status }) => status,
    ),
  ).toEqual(["NEW", "NEW"]);
  expect(
    await facts((module) => module.submit(moderator, first)),
  ).toMatchObject({
    alreadyImported: false,
    newVariants: 2,
    confirmedVariants: 0,
  });
  expect(
    await facts((module) => module.submit(moderator, first)),
  ).toMatchObject({
    alreadyImported: true,
    newVariants: 0,
  });

  const later = submission("b", [shop(120, "2026-11-26T05:00:00.000Z"), map]);

  expect(
    (await facts((module) => module.preview(moderator, later))).facts,
  ).toEqual([
    {
      factIndex: 0,
      kind: "SHOP",
      subject: "1046",
      status: "CHANGED",
      current: shop(100, "").fact,
    },
    { factIndex: 1, kind: "MAP", subject: "1", status: "SAME", current: null },
  ]);
  expect(
    await facts((module) => module.submit(moderator, later)),
  ).toMatchObject({
    newVariants: 1,
    confirmedVariants: 1,
  });

  const stale = submission("c", [shop(100, "2026-11-25T06:00:00.000Z")]);

  expect(
    (await facts((module) => module.preview(moderator, stale))).facts[0]
      ?.status,
  ).toBe("OLDER");

  const { rows } = await pool.query<{ observations: string }>(
    `SELECT count(*) AS observations FROM "CatalogFactObservation"`,
  );

  expect(rows[0]?.observations).toBe("4");
});

test("only catalog moderators read or write facts", async () => {
  const player: CatalogCaller = { userId: "player", roles: [] };
  const request = submission("d", [map]);

  await expect(
    facts((module) => module.preview(player, request)),
  ).rejects.toThrow("Catalog moderators only");
  await expect(
    facts((module) => module.submit(player, request)),
  ).rejects.toThrow("Catalog moderators only");
});
