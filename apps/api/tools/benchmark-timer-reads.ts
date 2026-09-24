import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
  timerTable,
  userSettingDocumentTable,
} from "../src/database/drizzle/schema.js";
// oxlint-disable-next-line anti-slop-effect/no-service-constructor-imports -- This offline benchmark compares the real data owner against its historical implementation.
import { makeAllTimerList } from "../src/http-api/handlers/timers/timer-list.data-layer.js";

// Runs only against a disposable, migrated PGlite database. No server or credentials.
const baselineRef = Bun.argv[2] ?? "1717850742";

const root = new URL("../../..", import.meta.url).pathname;

const sourcePath =
  "apps/api/src/http-api/handlers/timers/timer-list.data-layer.ts";

const prior = Bun.spawnSync(["git", "show", `${baselineRef}:${sourcePath}`], {
  cwd: root,
});

if (prior.exitCode !== 0) throw new Error(prior.stderr.toString());

const temporary = await mkdtemp(join(tmpdir(), "lootlog-timer-reads-"));

const boundary = await createDatabaseBoundary();

try {
  // Load the exact historical production implementation, not a maintained copy.
  const source = prior.stdout
    .toString()
    .replace(/from "([^"]+)"/g, (_match, specifier: string) => {
      const path = specifier.startsWith("#src/")
        ? `${root}/apps/api/src/${specifier.slice(5)}.ts`
        : Bun.resolveSync(
            specifier,
            `${root}/apps/api/src/http-api/handlers/timers`,
          );

      return `from ${JSON.stringify(path)}`;
    });

  const baselinePath = join(temporary, "baseline.ts");
  await Bun.write(baselinePath, source);

  const historical: { makeAllTimerList: typeof makeAllTimerList } =
    await import(baselinePath);

  const { database } = boundary;
  const now = new Date();
  const organizations = ["1", "2", "3"];

  const users = Array.from({ length: 24 }, (_, index) => ({
    userId: `user-${index}`,
    discordId: `discord-${index}`,
  }));

  await boundary.run(
    database
      .insert(guildTable)
      .values(
        organizations.map((id) => createGuildFixture({ id, ownerId: "owner" })),
      ),
  );
  await boundary.run(
    database.insert(roleTable).values(
      organizations.flatMap((guildId) =>
        Array.from({ length: 3 }, (_, index) => ({
          id: `${guildId}-${index}`,
          guildId,
          name: `Role ${index}`,
          permissions: [
            Permission.LOOTLOG_TIMERS_READ,
            Permission.LOOTLOG_TIMERS_HEROES_READ,
          ],
          lvlRangeFrom: 1,
          lvlRangeTo: 500,
          updatedAt: now,
        })),
      ),
    ),
  );

  const members = organizations.flatMap((guildId, organizationIndex) =>
    users.map((user, userIndex) =>
      createMemberFixture({
        id: organizationIndex * users.length + userIndex + 1,
        guildId,
        userId: user.discordId,
        globalUserId: user.userId,
      }),
    ),
  );

  await boundary.run(database.insert(memberTable).values(members));
  await boundary.run(
    database.insert(memberToRoleTable).values(
      members.flatMap((member) =>
        Array.from({ length: 3 }, (_, index) => ({
          A: member.id,
          B: `${member.guildId}-${index}`,
        })),
      ),
    ),
  );
  await boundary.run(
    database.insert(timerTable).values(
      organizations.flatMap((guildId) =>
        Array.from({ length: 22 }, (_, index) => ({
          guildId,
          world: "world",
          timerKey: `timer-${index}`,
          npcId: index + 1,
          createdById: Number(guildId) * users.length,
          npc: {
            id: index + 1,
            name: `Timer ${index}`,
            lvl: 100 + index,
            type: "HERO",
            margonemType: 1,
          },
          minSpawnTime: now,
          maxSpawnTime: new Date(
            now.getTime() + (index < 20 ? 3_600_000 : -3_600_000),
          ),
          updatedAt: now,
        })),
      ),
    ),
  );
  await boundary.run(
    database.insert(userSettingDocumentTable).values(
      users.map((user, index) => ({
        userId: user.userId,
        scopeId: user.userId,
        scopeType: "USER" as const,
        domain: "timers",
        updatedAt: now,
        overrides: {
          alwaysVisibleExpiredTimers: { world: [`timer-${20 + (index % 2)}`] },
        },
      })),
    ),
  );

  const before = historical.makeAllTimerList(database);
  const after = makeAllTimerList(database);

  const originalQuery = database.$client.pglite.query.bind(
    database.$client.pglite,
  );

  let sqlCalls = 0;
  let sqlRows = 0;
  let sqlBytes = 0;
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  database.$client.pglite.query = async <T>(
    ...args: Parameters<typeof originalQuery>
  ) => {
    const result = await originalQuery<T>(...args);
    sqlCalls++;
    sqlRows += result.rows.length;
    sqlBytes += Buffer.byteLength(JSON.stringify(result.rows));
    statements.push({ sql: args[0], params: args[1] ?? [] });

    return result;
  };

  const read = (list: typeof after, index: number) =>
    boundary.run(list(users[index % users.length], "world"));

  const expected = await read(before, 0);
  const actual = await read(after, 0);

  if (JSON.stringify(expected) !== JSON.stringify(actual))
    throw new Error("Production response parity failed");
  const afterStatements = statements.slice(-2);

  for (let index = 0; index < 24; index++) {
    await read(before, index);
    await read(after, index);
  }

  const report = [];

  for (const concurrency of [1, 24]) {
    for (const [version, list] of [
      ["before", before],
      ["after", after],
    ] as const) {
      sqlCalls = 0;
      sqlRows = 0;
      sqlBytes = 0;
      statements.length = 0;
      const latencies: number[] = [];
      let responseBytes = 0;
      let responseRows = 0;
      const activeUsers = new Set<string>();
      const activeRawScopes = new Map<number, number>();
      let sameUserOverlaps = 0;
      let equivalentRawScopeOverlaps = 0;
      const cpuStart = process.cpuUsage();
      const started = performance.now();

      for (let batch = 0; batch < 96; batch += concurrency) {
        await Promise.all(
          Array.from({ length: concurrency }, async (_, offset) => {
            const userIndex = (batch + offset) % users.length;
            const user = users[userIndex];
            // Fixture scope: same organizations/world; two selected-key sets.
            // This measures request overlap, not an implemented cache hit.
            const rawScope = userIndex % 2;

            if (activeUsers.has(user.userId)) sameUserOverlaps++;

            if ((activeRawScopes.get(rawScope) ?? 0) > 0)
              equivalentRawScopeOverlaps++;
            activeUsers.add(user.userId);
            activeRawScopes.set(
              rawScope,
              (activeRawScopes.get(rawScope) ?? 0) + 1,
            );
            const requestStarted = performance.now();
            const timers = await read(list, batch + offset);
            activeUsers.delete(user.userId);
            activeRawScopes.set(
              rawScope,
              (activeRawScopes.get(rawScope) ?? 1) - 1,
            );
            latencies.push(performance.now() - requestStarted);
            responseRows += timers.length;
            responseBytes += Buffer.byteLength(JSON.stringify(timers));
          }),
        );
      }

      const elapsedMs = performance.now() - started;
      const cpu = process.cpuUsage(cpuStart);
      latencies.sort((a, b) => a - b);
      report.push({
        workload:
          concurrency === 1 ? "steady-sequential" : "reconnect-24-concurrent",
        version,
        requests: latencies.length,
        sqlCalls,
        sqlRows,
        sqlBytes,
        responseRows,
        responseBytes,
        sameUserOverlaps,
        equivalentRawScopeOverlaps,
        cacheHits: 0,
        coalescedRequests: 0,
        elapsedMs: +elapsedMs.toFixed(2),
        cpuMs: +((cpu.user + cpu.system) / 1000).toFixed(2),
        p50Ms: +latencies[Math.floor(latencies.length * 0.5)].toFixed(2),
        p95Ms: +latencies[Math.floor(latencies.length * 0.95)].toFixed(2),
        p99Ms: +latencies[Math.floor(latencies.length * 0.99)].toFixed(2),
      });
    }
  }

  database.$client.pglite.query = originalQuery;
  process.stdout.write(
    JSON.stringify(
      {
        baselineRef,
        database: "PGlite; single connection; JS + WASM CPU; no network delay",
        report,
      },
      null,
      2,
    ) + "\n",
  );

  for (const statement of afterStatements) {
    const plan = await boundary.run(
      database.$client.unsafe(
        `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${statement.sql}`,
        statement.params,
      ),
    );

    process.stdout.write(
      JSON.stringify({ sql: statement.sql, plan }, null, 2) + "\n",
    );
  }
} finally {
  await boundary.dispose();
  await rm(temporary, { recursive: true, force: true });
}
