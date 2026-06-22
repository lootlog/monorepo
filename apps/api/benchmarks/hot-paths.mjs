#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const { Client } = pg;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const apiDir = dirname(scriptDir);
const repoRoot = dirname(dirname(apiDir));

for (const envPath of [join(repoRoot, ".env"), join(apiDir, ".env")]) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false, quiet: true });
  }
}

const SQL_FIXTURE_ENV = {
  lootGuildId: ["BENCH_LOOT_GUILD_ID", "BENCH_GUILD_ID"],
  lootWorld: ["BENCH_LOOT_WORLD", "BENCH_WORLD"],
  hid: ["BENCH_HID"],
  itemName: ["BENCH_ITEM_NAME"],
  killGuildId: ["BENCH_KILL_GUILD_ID", "BENCH_GUILD_ID"],
  killWorld: ["BENCH_KILL_WORLD", "BENCH_WORLD"],
  killNpcType: ["BENCH_KILL_NPC_TYPE"],
  killUserId: ["BENCH_KILL_USER_ID"],
};

const HTTP_FIXTURE_ENV = {
  lootDiscordId: ["BENCH_LOOT_HTTP_DISCORD_ID", "BENCH_HTTP_DISCORD_ID"],
  lootUserId: ["BENCH_LOOT_HTTP_USER_ID", "BENCH_HTTP_USER_ID"],
  killDiscordId: ["BENCH_KILL_HTTP_DISCORD_ID", "BENCH_HTTP_DISCORD_ID"],
  killUserId: ["BENCH_KILL_HTTP_USER_ID", "BENCH_HTTP_USER_ID"],
};

const queries = [
  {
    name: "loot.resolve_by_hid",
    params: (fixture) => [fixture.lootGuildId, fixture.lootWorld, fixture.hid],
    sql: `
      SELECT l.id
      FROM "Loot" l
      WHERE l.world = $2
        AND EXISTS (
          SELECT 1
          FROM "LootSubmission" ls
          WHERE ls."lootId" = l.id
            AND ls."guildId" = $1
        )
        AND EXISTS (
          SELECT 1
          FROM "LootItem" li
          WHERE li."lootId" = l.id
            AND li.hid = $3
        )
      ORDER BY l.id DESC
      LIMIT 1
    `,
  },
  {
    name: "loot.list_by_item_snapshot_id",
    params: (fixture) => [
      fixture.lootGuildId,
      fixture.lootWorld,
      fixture.itemSnapshotIds,
    ],
    sql: `
      SELECT l.id
      FROM "Loot" l
      WHERE l.world = $2
        AND EXISTS (
          SELECT 1
          FROM "LootSubmission" ls
          WHERE ls."lootId" = l.id
            AND ls."guildId" = $1
        )
        AND EXISTS (
          SELECT 1
          FROM "LootItem" li
          WHERE li."lootId" = l.id
            AND li."itemSnapshotId" = ANY($3::int[])
        )
      ORDER BY l.id DESC
      LIMIT 50
    `,
  },
  {
    name: "loot.count_by_item_snapshot_id",
    params: (fixture) => [
      fixture.lootGuildId,
      fixture.lootWorld,
      fixture.itemSnapshotIds,
    ],
    sql: `
      SELECT count(*)::bigint AS count
      FROM "Loot" l
      WHERE l.world = $2
        AND EXISTS (
          SELECT 1
          FROM "LootSubmission" ls
          WHERE ls."lootId" = l.id
            AND ls."guildId" = $1
        )
        AND EXISTS (
          SELECT 1
          FROM "LootItem" li
          WHERE li."lootId" = l.id
            AND li."itemSnapshotId" = ANY($3::int[])
        )
    `,
  },
  {
    name: "kills.guild_top_npcs",
    params: (fixture) => [
      fixture.killGuildId,
      fixture.killWorld,
      fixture.killNpcType,
    ],
    sql: `
      SELECT
        "npcId",
        "npcName",
        "npcType",
        "npcLvl",
        sum("memberKills")::bigint AS kills
      FROM "NpcKillStats"
      WHERE "guildId" = $1
        AND world = $2
        AND "npcType" = CAST($3 AS "NpcType")
      GROUP BY "npcId", "npcName", "npcType", "npcLvl"
      ORDER BY kills DESC
      LIMIT 50
    `,
  },
  {
    name: "kills.guild_summary_top_npcs",
    params: (fixture) => [
      fixture.killGuildId,
      fixture.killWorld,
      fixture.killNpcType,
    ],
    sql: `
      SELECT
        "npcId",
        "npcName",
        "npcType",
        "npcLvl",
        "uniqueKills"
      FROM "GuildKillSummary"
      WHERE "guildId" = $1
        AND world = $2
        AND "npcType" = CAST($3 AS "NpcType")
      ORDER BY "uniqueKills" DESC
      LIMIT 50
    `,
  },
  {
    name: "kills.user_top_npcs",
    params: (fixture) => [
      fixture.killUserId,
      fixture.killWorld,
      fixture.killNpcType,
    ],
    sql: `
      SELECT
        "npcId",
        "npcName",
        "npcType",
        "npcLvl",
        "totalKills"
      FROM "UserKillStats"
      WHERE "userId" = $1
        AND world = $2
        AND "npcType" = CAST($3 AS "NpcType")
      ORDER BY "totalKills" DESC
      LIMIT 50
    `,
  },
];

function parseArgs(argv) {
  const options = {
    apiUrl: "http://localhost:4003",
    http: false,
    httpConcurrency: 1,
    httpIterations: undefined,
    iterations: 5,
    label: "local",
    pretty: true,
    warmup: 1,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--http") {
      options.http = true;
      continue;
    }

    if (arg === "--compact") {
      options.pretty = false;
      continue;
    }

    const next = argv[index + 1];

    if (arg === "--label" && next) {
      options.label = next;
      index += 1;
      continue;
    }

    if (arg === "--iterations" && next) {
      options.iterations = Number.parseInt(next, 10);
      index += 1;
      continue;
    }

    if (arg === "--warmup" && next) {
      options.warmup = Number.parseInt(next, 10);
      index += 1;
      continue;
    }

    if (arg === "--api-url" && next) {
      options.apiUrl = next;
      index += 1;
      continue;
    }

    if (arg === "--http-concurrency" && next) {
      options.httpConcurrency = Number.parseInt(next, 10);
      index += 1;
      continue;
    }

    if (arg === "--http-iterations" && next) {
      options.httpIterations = Number.parseInt(next, 10);
      index += 1;
      continue;
    }

    throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  if (options.iterations < 1) {
    throw new Error("--iterations must be >= 1");
  }

  if (options.warmup < 0) {
    throw new Error("--warmup must be >= 0");
  }

  if (options.httpConcurrency < 1) {
    throw new Error("--http-concurrency must be >= 1");
  }

  if (options.httpIterations !== undefined && options.httpIterations < 1) {
    throw new Error("--http-iterations must be >= 1");
  }

  return options;
}

function firstEnv(names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }

  return undefined;
}

function readFixture() {
  const fixture = {};

  for (const [key, envNames] of Object.entries(SQL_FIXTURE_ENV)) {
    fixture[key] = firstEnv(envNames);
  }

  const missing = Object.entries(fixture)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing benchmark fixture env vars for: ${missing.join(", ")}`,
    );
  }

  return fixture;
}

async function hydrateFixture(client, fixture) {
  const result = await client.query(
    `
      SELECT id
      FROM "ItemSnapshot"
      WHERE name = $1
      ORDER BY id ASC
    `,
    [fixture.itemName],
  );
  const itemSnapshotIds = result.rows.map((row) => row.id);

  if (itemSnapshotIds.length === 0) {
    throw new Error(`No ItemSnapshot rows found for ${fixture.itemName}`);
  }

  return {
    ...fixture,
    itemSnapshotIds,
  };
}

function readHttpFixture() {
  const fixture = {};

  for (const [key, envNames] of Object.entries(HTTP_FIXTURE_ENV)) {
    fixture[key] = firstEnv(envNames);
  }

  return fixture;
}

function percentile(sorted, percentileValue) {
  if (sorted.length === 0) {
    return null;
  }

  const index = Math.min(
    sorted.length - 1,
    Math.ceil(sorted.length * percentileValue) - 1,
  );

  return sorted[index];
}

function summarizeSamples(samples) {
  const sorted = [...samples].sort((left, right) => left - right);
  const sum = sorted.reduce((total, value) => total + value, 0);

  return {
    samples: sorted.map((value) => round(value)),
    min: round(sorted[0]),
    median: round(percentile(sorted, 0.5)),
    p95: round(percentile(sorted, 0.95)),
    max: round(sorted[sorted.length - 1]),
    avg: round(sum / sorted.length),
  };
}

function round(value) {
  if (value === null) {
    return null;
  }

  return Math.round(value * 1000) / 1000;
}

function collectPlanStats(plan) {
  const indexes = new Set();
  const relations = new Set();
  const nodeTypes = new Map();
  const blocks = {
    sharedHit: 0,
    sharedRead: 0,
    tempRead: 0,
    tempWritten: 0,
  };

  function walk(node) {
    if (!node) {
      return;
    }

    if (node["Node Type"]) {
      nodeTypes.set(
        node["Node Type"],
        (nodeTypes.get(node["Node Type"]) ?? 0) + 1,
      );
    }

    if (node["Index Name"]) {
      indexes.add(node["Index Name"]);
    }

    if (node["Relation Name"]) {
      relations.add(node["Relation Name"]);
    }

    blocks.sharedHit += node["Shared Hit Blocks"] ?? 0;
    blocks.sharedRead += node["Shared Read Blocks"] ?? 0;
    blocks.tempRead += node["Temp Read Blocks"] ?? 0;
    blocks.tempWritten += node["Temp Written Blocks"] ?? 0;

    for (const child of node.Plans ?? []) {
      walk(child);
    }
  }

  walk(plan.Plan);

  return {
    indexes: [...indexes].sort(),
    relations: [...relations].sort(),
    nodeTypes: Object.fromEntries(
      [...nodeTypes.entries()].sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    blocks,
  };
}

async function runExplain(client, query, params) {
  const result = await client.query(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query.sql}`,
    params,
  );
  const [plan] = result.rows[0]["QUERY PLAN"];

  return {
    executionMs: plan["Execution Time"],
    planningMs: plan["Planning Time"],
    plan: collectPlanStats(plan),
    rootActualRows: plan.Plan["Actual Rows"],
  };
}

async function runSqlBenchmarks(client, fixture, options) {
  const results = [];

  for (const query of queries) {
    const params = query.params(fixture);

    for (let index = 0; index < options.warmup; index += 1) {
      await runExplain(client, query, params);
    }

    const executionSamples = [];
    const planningSamples = [];
    let lastPlan;
    let rootActualRows;

    for (let index = 0; index < options.iterations; index += 1) {
      const sample = await runExplain(client, query, params);
      executionSamples.push(sample.executionMs);
      planningSamples.push(sample.planningMs);
      lastPlan = sample.plan;
      rootActualRows = sample.rootActualRows;
    }

    results.push({
      name: query.name,
      executionMs: summarizeSamples(executionSamples),
      planningMs: summarizeSamples(planningSamples),
      rootActualRows,
      plan: lastPlan,
    });
  }

  return results;
}

function createDevPermissionOverride(guildId) {
  const override = {
    enabled: true,
    guildId,
    permissions: ["ADMIN"],
  };

  return Buffer.from(JSON.stringify(override)).toString("base64url");
}

function buildHttpEndpoints(fixture, httpFixture) {
  const endpoints = [];

  if (httpFixture.lootDiscordId && httpFixture.lootUserId) {
    endpoints.push({
      name: "http.loot.resolve_by_hid",
      guildId: fixture.lootGuildId,
      auth: {
        discordId: httpFixture.lootDiscordId,
        userId: httpFixture.lootUserId,
      },
      path: `/guilds/${fixture.lootGuildId}/loots/items/resolve`,
      params: {
        hid: fixture.hid,
        world: fixture.lootWorld,
      },
    });

    endpoints.push({
      name: "http.loot.count_by_item_name",
      guildId: fixture.lootGuildId,
      auth: {
        discordId: httpFixture.lootDiscordId,
        userId: httpFixture.lootUserId,
      },
      path: `/guilds/${fixture.lootGuildId}/loots/count`,
      params: {
        itemNames: fixture.itemName,
        world: fixture.lootWorld,
      },
    });
  }

  if (httpFixture.killDiscordId && httpFixture.killUserId) {
    endpoints.push({
      name: "http.kills.guild_top_npcs",
      guildId: fixture.killGuildId,
      auth: {
        discordId: httpFixture.killDiscordId,
        userId: httpFixture.killUserId,
      },
      path: `/guilds/${fixture.killGuildId}/stats/kills/top-npcs`,
      params: {
        limit: "50",
        npcType: fixture.killNpcType,
        world: fixture.killWorld,
      },
    });
  }

  return endpoints;
}

async function timeFetch(endpoint, apiUrl) {
  const url = new URL(endpoint.path, apiUrl);

  for (const [key, value] of Object.entries(endpoint.params)) {
    url.searchParams.set(key, value);
  }

  const startedAt = performance.now();
  const response = await fetch(url, {
    headers: {
      "x-auth-discord-id": endpoint.auth.discordId,
      "x-auth-user-id": endpoint.auth.userId,
      "x-lootlog-dev-permission-override": createDevPermissionOverride(
        endpoint.guildId,
      ),
    },
  });
  const body = await response.text();
  const durationMs = performance.now() - startedAt;

  if (!response.ok) {
    throw new Error(
      `${endpoint.name} returned HTTP ${response.status}: ${body.slice(0, 500)}`,
    );
  }

  return {
    durationMs,
    bytes: Buffer.byteLength(body),
    status: response.status,
  };
}

async function runHttpBenchmarks(fixture, options) {
  const httpFixture = readHttpFixture();
  const endpoints = buildHttpEndpoints(fixture, httpFixture);

  if (endpoints.length === 0) {
    return {
      skipped: true,
      reason:
        "Set BENCH_HTTP_DISCORD_ID/BENCH_HTTP_USER_ID or per-area HTTP fixture env vars to enable HTTP benchmarks.",
      endpoints: [],
    };
  }

  const iterations = options.httpIterations ?? options.iterations;
  const results = [];

  for (const endpoint of endpoints) {
    for (let index = 0; index < options.warmup; index += 1) {
      await timeFetch(endpoint, options.apiUrl);
    }

    const samples = [];
    let status = null;
    let bytes = null;

    for (let index = 0; index < iterations; index += 1) {
      const batch = await Promise.all(
        Array.from({ length: options.httpConcurrency }, () =>
          timeFetch(endpoint, options.apiUrl),
        ),
      );

      for (const sample of batch) {
        samples.push(sample.durationMs);
        status = sample.status;
        bytes = sample.bytes;
      }
    }

    results.push({
      name: endpoint.name,
      status,
      bytes,
      concurrency: options.httpConcurrency,
      requests: samples.length,
      durationMs: summarizeSamples(samples),
    });
  }

  return {
    skipped: false,
    endpoints: results,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const connectionString = process.env.POSTGRESQL_CONNECTION_URI;

  if (!connectionString) {
    throw new Error("POSTGRESQL_CONNECTION_URI is required");
  }

  const fixture = readFixture();
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const hydratedFixture = await hydrateFixture(client, fixture);
    const sql = await runSqlBenchmarks(client, hydratedFixture, options);
    let http;

    if (options.http) {
      http = await runHttpBenchmarks(hydratedFixture, options);
    }

    const report = {
      label: options.label,
      timestamp: new Date().toISOString(),
      database: {
        host: client.host,
        port: client.port,
        database: client.database,
      },
      options: {
        iterations: options.iterations,
        warmup: options.warmup,
        http: options.http,
        httpConcurrency: options.httpConcurrency,
        httpIterations: options.httpIterations ?? options.iterations,
      },
      fixture: hydratedFixture,
      sql,
      http,
    };

    const spacing = options.pretty ? 2 : 0;
    process.stdout.write(`${JSON.stringify(report, null, spacing)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
