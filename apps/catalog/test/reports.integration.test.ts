import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
import { makePostgresLayer } from "@lootlog/database";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { ApplicationError } from "@lootlog/protocol/http/errors";
import { Effect, Layer, ManagedRuntime, Redacted, Schema } from "effect";
import pg from "pg";
import { CatalogDatabase } from "#src/database/database";
import { migrateCatalogDatabase } from "#src/database/migrate";
import {
  DAILY_REPORT_LIMIT,
  makeReportsModule,
  type ReportCaller,
  type ReportsModule,
} from "#src/reports/reports.service";

let postgres: StartedPostgreSqlContainer;

let pool: pg.Pool;

let runtime: ManagedRuntime.ManagedRuntime<CatalogDatabase, unknown>;

const moderator: ReportCaller = { userId: "moderator", roles: [] };

const alice: ReportCaller = { userId: "alice", roles: [] };

const bob: ReportCaller = { userId: "bob", roles: [] };

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
  await pool.query(`TRUNCATE "CatalogItem", "CatalogNpc", "CatalogReport"`);
  await pool.query(
    `INSERT INTO "CatalogItem" (uid, "gameVersion", "itemId", document)
     VALUES ('pl:7:old', 'pl', 7, '{"name": "Old name", "icon": "old.gif", "firstSeenAt": 1}'),
            ('pl:7:new', 'pl', 7, '{"name": "Miecz", "icon": "sword.gif", "firstSeenAt": 2}')`,
  );
  await pool.query(
    `INSERT INTO "CatalogNpc" (uid, "monsterKey", document)
     VALUES ('npc:old', 'm', '{"id": 9, "gameVersion": "pl", "name": "Former", "current": false}'),
            ('npc:new', 'm', '{"id": 9, "gameVersion": "pl", "name": "Barbatos", "icon": "b.gif"}')`,
  );
});

const reports = <A>(
  run: (module: ReportsModule) => Effect.Effect<A, unknown>,
) =>
  runtime.runPromise(
    Effect.gen(function* () {
      return yield* run(
        makeReportsModule(yield* CatalogDatabase, [moderator.userId]),
      );
    }),
  );

const failure = (
  run: (module: ReportsModule) => Effect.Effect<unknown, unknown>,
) =>
  reports((module) =>
    run(module).pipe(
      Effect.flip,
      Effect.map((error) =>
        Schema.is(ApplicationError)(error) ? error.body.code : error,
      ),
    ),
  );

const sword = { subjectType: "ITEM", gameVersion: "pl", subjectId: 7 } as const;

const barbatos = {
  subjectType: "NPC",
  gameVersion: "pl",
  subjectId: 9,
} as const;

test("reporting a page again replaces the User's open report instead of adding one", async () => {
  await reports((module) =>
    module.create(alice, { ...sword, reason: "NOT_IN_GAME" }),
  );

  const again = await reports((module) =>
    module.create(alice, {
      ...sword,
      reason: "WRONG_DETAILS",
      comment: "  Ma inny poziom  ",
    }),
  );

  const own = await reports((module) => module.getOwn(alice, sword));

  expect(own.report).toEqual(again);
  expect(again).toMatchObject({
    reason: "WRONG_DETAILS",
    comment: "Ma inny poziom",
  });
  expect(
    (await pool.query(`SELECT count(*)::int AS n FROM "CatalogReport"`)).rows[0]
      .n,
  ).toBe(1);
  expect(
    (await reports((module) => module.getOwn(bob, sword))).report,
  ).toBeNull();
});

test("a report names a page the catalog has and explains another problem", async () => {
  expect(
    await failure((module) =>
      module.create(alice, { ...sword, subjectId: 8, reason: "NOT_IN_GAME" }),
    ),
  ).toBe("NOT_FOUND");
  expect(
    await failure((module) =>
      module.create(alice, { ...sword, reason: "OTHER", comment: "   " }),
    ),
  ).toBe("COMMENT_REQUIRED");
});

test("a User files a bounded number of reports a day", async () => {
  await pool.query(
    `INSERT INTO "CatalogReport" ("subjectType", "gameVersion", "subjectId", reason, "reporterUserId", status)
     SELECT 'ITEM', 'pl', 7, 'OTHER', 'alice', 'REJECTED' FROM generate_series(1, $1)`,
    [DAILY_REPORT_LIMIT],
  );

  expect(
    await failure((module) =>
      module.create(alice, { ...sword, reason: "NOT_IN_GAME" }),
    ),
  ).toBe("REPORT_LIMIT_REACHED");
  await reports((module) =>
    module.create(bob, { ...sword, reason: "NOT_IN_GAME" }),
  );
});

test("only the reporter withdraws a report, and only before review", async () => {
  const report = await reports((module) =>
    module.create(alice, { ...sword, reason: "NOT_IN_GAME" }),
  );

  expect(await failure((module) => module.withdraw(bob, report.id))).toBe(
    "NOT_FOUND",
  );

  await reports((module) =>
    module.review(moderator, { reportIds: [report.id], status: "REJECTED" }),
  );

  expect(await failure((module) => module.withdraw(alice, report.id))).toBe(
    "NOT_FOUND",
  );

  await reports((module) =>
    module.review(moderator, { reportIds: [report.id], status: "OPEN" }),
  );
  await reports((module) => module.withdraw(alice, report.id));
  expect(
    (await reports((module) => module.getOwn(alice, sword))).report,
  ).toBeNull();
});

test("moderators alone see the queue, most reported page first, under its current name", async () => {
  await reports((module) =>
    Effect.all([
      module.create(alice, { ...barbatos, reason: "WRONG_LOCATIONS" }),
      module.create(alice, { ...sword, reason: "NOT_IN_GAME" }),
      module.create(bob, { ...sword, reason: "WRONG_DROPS" }),
    ]),
  );

  expect(await failure((module) => module.list(alice, {}))).toBe("FORBIDDEN");

  expect(
    await failure((module) =>
      module.list({ ...alice, roles: ["global-chat-admin"] }, {}),
    ),
  ).toBe("FORBIDDEN");

  for (const role of ["wiki-moderator", "admin"] as const) {
    const caller: ReportCaller = { ...alice, roles: [role] };

    expect((await reports((module) => module.list(caller, {}))).total).toBe(2);
    expect(
      await reports((module) => Effect.succeed(module.viewer(caller))),
    ).toEqual({ canModerate: true });
  }

  const queue = await reports((module) => module.list(moderator, {}));

  expect(queue.total).toBe(2);
  expect(
    queue.subjects.map(({ name, icon, reports }) => ({
      name,
      icon,
      reasons: reports.map(({ reason }) => reason).sort(),
    })),
  ).toEqual([
    {
      name: "Miecz",
      icon: "sword.gif",
      reasons: ["NOT_IN_GAME", "WRONG_DROPS"],
    },
    { name: "Barbatos", icon: "b.gif", reasons: ["WRONG_LOCATIONS"] },
  ]);

  const second = await reports((module) =>
    module.list(moderator, { limit: 1, offset: 1 }),
  );

  expect(second.subjects.map(({ name }) => name)).toEqual(["Barbatos"]);
  expect(second.total).toBe(2);
});

test("a review moves reports between the queue and history, and reopening keeps one open report per reporter", async () => {
  const first = await reports((module) =>
    module.create(alice, { ...sword, reason: "NOT_IN_GAME" }),
  );

  expect(
    await failure((module) =>
      module.review(alice, { reportIds: [first.id], status: "RESOLVED" }),
    ),
  ).toBe("FORBIDDEN");

  await reports((module) =>
    module.review(moderator, { reportIds: [first.id], status: "RESOLVED" }),
  );

  const resolved = await reports((module) =>
    module.list(moderator, { status: "RESOLVED" }),
  );

  expect(resolved.subjects[0]?.reports[0]).toMatchObject({
    id: first.id,
    status: "RESOLVED",
  });
  expect((await reports((module) => module.list(moderator, {}))).total).toBe(0);

  await reports((module) =>
    module.create(alice, { ...sword, reason: "WRONG_DETAILS" }),
  );

  expect(
    await failure((module) =>
      module.review(moderator, { reportIds: [first.id], status: "OPEN" }),
    ),
  ).toBe("REPORT_ALREADY_OPEN");
  expect(
    await failure((module) =>
      module.review(moderator, {
        reportIds: [first.id, "00000000-0000-4000-8000-000000000000"],
        status: "REJECTED",
      }),
    ),
  ).toBe("NOT_FOUND");
  expect(
    (
      await pool.query(`SELECT status FROM "CatalogReport" WHERE id = $1`, [
        first.id,
      ])
    ).rows[0].status,
  ).toBe("RESOLVED");
});
