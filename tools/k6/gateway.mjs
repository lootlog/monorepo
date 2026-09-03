#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { RealtimeClient } from "@lootlog/client/realtime";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const defaultSecretsPath = resolve(scriptDir, ".secrets.local");

const args = parseArgs(process.argv.slice(2));
const secrets = readSecrets(args.secretsPath || defaultSecretsPath);
const config = buildConfig(args, secrets);
const metrics = {
  connectErrors: 0,
  connects: 0,
  fetchErrors: 0,
  fetchForbidden: 0,
  fetchSuccess: 0,
  joinErrors: 0,
  joinSuccess: 0,
  publishErrors: 0,
  publishSuccess: 0,
  latencies: {
    connect: [],
    join: [],
    presenceFetch: [],
    presencePublish: [],
  },
};

if (config.authTickets.length === 0 && !config.cookieHeader) {
  process.stderr.write(
    "Missing AUTH_TICKETS or AUTH_COOKIE. Put one in tools/k6/.secrets.local or export it in the shell.\n",
  );
  process.exit(1);
}
if (!config.cookieHeader && config.authTickets.length < config.connections) {
  process.stderr.write(
    "One unique websocket ticket is required for each connection; tickets cannot be reused.\n",
  );
  process.exit(1);
}

await Promise.all(
  Array.from({ length: config.connections }, (_, index) =>
    runConnection(index),
  ),
);

printSummary();

if (
  metrics.connectErrors > 0 ||
  metrics.joinErrors > 0 ||
  metrics.publishErrors > 0 ||
  metrics.connects === 0
) {
  process.exit(1);
}

function runConnection(index) {
  return new Promise((resolveConnection) => {
    const startedAt = performance.now();
    const client = new RealtimeClient({
      url: config.url,
      path: config.path,
      requestTimeoutMs: config.timeoutMs,
      webSocketFactory: (url, protocols) =>
        new WebSocket(url, {
          headers: buildHeaders(index),
          ...(protocols?.length ? { protocols } : {}),
        }),
    });
    let presenceInterval;
    let resolved = false;
    let joining = false;
    let joined = false;
    let connectionStarted = false;

    const finish = () => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearInterval(presenceInterval);
      unsubscribeState();
      client.disconnect();
      resolveConnection();
    };

    const join = async () => {
      if (joining || joined) return;
      joining = true;
      metrics.connects += 1;
      metrics.latencies.connect.push(performance.now() - startedAt);
      const joinStartedAt = performance.now();
      try {
        const player = buildPlayer(index);
        const result = await client.join({
          world: player.world,
          character: player,
        });
        metrics.latencies.join.push(performance.now() - joinStartedAt);
        const organizationIds = Array.isArray(result?.organizationIds)
          ? result.organizationIds
          : [];
        const organizationId =
          config.organizationId || organizationIds.at(0) || "";
        if (!organizationId) {
          throw new Error("session.join returned no authorized organization");
        }
        await publishPresence(client, organizationId, player);
        joined = true;
        metrics.joinSuccess += 1;
        void fetchPresence(client, organizationId);
        presenceInterval = setInterval(() => {
          void publishPresence(client, organizationId, player).catch(
            (error) => {
              process.stderr.write(
                `[gateway] presence publish error: ${error instanceof Error ? error.message : String(error)}\n`,
              );
            },
          );
          void fetchPresence(client, organizationId);
        }, config.presenceIntervalMs);
      } catch (error) {
        metrics.joinErrors += 1;
        process.stderr.write(
          `[gateway] join error: ${error instanceof Error ? error.message : String(error)}\n`,
        );
        finish();
      } finally {
        joining = false;
      }
    };

    const unsubscribeState = client.subscribeState((state) => {
      if (state === "connected") void join();
      if (
        state === "disconnected" &&
        connectionStarted &&
        !joined &&
        !resolved
      ) {
        metrics.connectErrors += 1;
      }
    });

    connectionStarted = true;
    client.connect();
    setTimeout(finish, config.durationMs);
  });
}

async function publishPresence(client, organizationId, character) {
  const startedAt = performance.now();
  try {
    await client.request("presence.publish", {
      organizationIds: [organizationId],
      isAfk: false,
      character,
      location: {
        mapId: config.mapId,
        map: config.mapName,
        x: 0,
        y: 0,
      },
      clientObservedAt: Date.now(),
    });
    metrics.publishSuccess += 1;
  } catch (error) {
    metrics.publishErrors += 1;
    throw error;
  } finally {
    metrics.latencies.presencePublish.push(performance.now() - startedAt);
  }
}

async function fetchPresence(client, organizationId) {
  const startedAt = performance.now();
  try {
    await client.request("presence.fetch", {
      organizationId,
      world: config.world,
    });
    metrics.fetchSuccess += 1;
  } catch (error) {
    if (error?.code === "COMMAND_REJECTED") {
      metrics.fetchForbidden += 1;
    } else {
      metrics.fetchErrors += 1;
    }
  } finally {
    metrics.latencies.presenceFetch.push(performance.now() - startedAt);
  }
}

function buildHeaders(connectionIndex) {
  const headers = {
    Origin: config.origin,
  };

  const ticket = config.authTickets[connectionIndex];
  if (ticket) {
    headers.Authorization = `Bearer ${ticket}`;
  }

  if (config.cookieHeader) {
    headers.Cookie = config.cookieHeader;
  }

  return headers;
}

function buildPlayer(index) {
  if (config.player) {
    return {
      ...config.player,
      characterId: `${config.player.characterId}-${index}`,
    };
  }

  return {
    accountId: `k6-account-${index}`,
    characterId: `k6-character-${index}`,
    icon: "",
    location: {
      map: config.mapName,
      x: 0,
      y: 0,
    },
    lvl: 300,
    name: `k6-${index}`,
    prof: "w",
    world: config.world,
  };
}

// oxlint-disable-next-line eslint/complexity -- Flat CLI/env precedence is intentionally explicit.
function buildConfig(cliArgs, secrets) {
  const authCookie = secrets.AUTH_COOKIE || process.env.AUTH_COOKIE || "";
  const authTickets = (
    secrets.AUTH_TICKETS ||
    process.env.AUTH_TICKETS ||
    secrets.AUTH_TICKET ||
    process.env.AUTH_TICKET ||
    secrets.AUTH_TOKEN ||
    process.env.AUTH_TOKEN ||
    ""
  )
    .split(",")
    .map((ticket) => ticket.trim().replace(/^Bearer\s+/i, ""))
    .filter(Boolean);

  return {
    authTickets,
    connections: numberValue(cliArgs.connections, "K6_GATEWAY_CONNECTIONS", 1),
    cookieHeader: authCookie,
    durationMs: durationMs(
      cliArgs.duration || process.env.K6_GATEWAY_DURATION || "30s",
    ),
    organizationId:
      process.env.K6_ORGANIZATION_ID || process.env.K6_GUILD_ID || "",
    mapId: numberValue(cliArgs.mapId, "K6_GATEWAY_MAP_ID", 1),
    mapName: cliArgs.mapName || process.env.K6_GATEWAY_MAP_NAME || "Ithan",
    origin:
      cliArgs.origin || process.env.K6_GATEWAY_ORIGIN || "http://localhost",
    path: cliArgs.path || process.env.K6_GATEWAY_SOCKET_PATH || "/ws",
    player: parsePlayer(process.env.K6_GATEWAY_PLAYER_JSON),
    presenceIntervalMs: durationMs(
      cliArgs.presenceInterval ||
        process.env.K6_GATEWAY_PRESENCE_INTERVAL ||
        "5s",
    ),
    timeoutMs: durationMs(
      cliArgs.timeout || process.env.K6_GATEWAY_TIMEOUT || "10s",
    ),
    url: cliArgs.url || process.env.K6_GATEWAY_URL || "http://localhost",
    world: cliArgs.world || process.env.K6_WORLD || "classic",
  };
}

function readSecrets(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        if (separatorIndex === -1) {
          return [line, ""];
        }

        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      }),
  );
}

// oxlint-disable-next-line eslint/complexity -- Every supported flag is parsed independently.
function parseArgs(rawArgs) {
  const parsed = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    const next = rawArgs[index + 1];

    if (arg === "--connections" && next) {
      parsed.connections = next;
      index += 1;
      continue;
    }

    if (arg === "--duration" && next) {
      parsed.duration = next;
      index += 1;
      continue;
    }

    if (arg === "--map-id" && next) {
      parsed.mapId = next;
      index += 1;
      continue;
    }

    if (arg === "--map-name" && next) {
      parsed.mapName = next;
      index += 1;
      continue;
    }

    if (arg === "--origin" && next) {
      parsed.origin = next;
      index += 1;
      continue;
    }

    if (arg === "--path" && next) {
      parsed.path = next;
      index += 1;
      continue;
    }

    if (arg === "--presence-interval" && next) {
      parsed.presenceInterval = next;
      index += 1;
      continue;
    }

    if (arg === "--secrets" && next) {
      parsed.secretsPath = resolve(repoRoot, next);
      index += 1;
      continue;
    }

    if (arg === "--timeout" && next) {
      parsed.timeout = next;
      index += 1;
      continue;
    }

    if (arg === "--url" && next) {
      parsed.url = next;
      index += 1;
      continue;
    }

    if (arg === "--world" && next) {
      parsed.world = next;
      index += 1;
    }
  }

  return parsed;
}

function parsePlayer(rawPlayer) {
  if (!rawPlayer) {
    return null;
  }

  try {
    return JSON.parse(rawPlayer);
  } catch {
    console.warn("[gateway] Ignoring invalid K6_GATEWAY_PLAYER_JSON");
    return null;
  }
}

function durationMs(value) {
  const match = String(value).match(/^(\d+(?:\.\d+)?)(ms|s|m)?$/);
  if (!match) {
    return 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2] || "ms";

  if (unit === "m") {
    return amount * 60_000;
  }

  if (unit === "s") {
    return amount * 1000;
  }

  return amount;
}

function numberValue(cliValue, envName, fallback) {
  const value = cliValue || process.env[envName];
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function printSummary() {
  process.stdout.write(
    `${JSON.stringify(
      {
        connectErrors: metrics.connectErrors,
        connects: metrics.connects,
        fetchErrors: metrics.fetchErrors,
        fetchForbidden: metrics.fetchForbidden,
        fetchSuccess: metrics.fetchSuccess,
        joinErrors: metrics.joinErrors,
        joinSuccess: metrics.joinSuccess,
        publishErrors: metrics.publishErrors,
        publishSuccess: metrics.publishSuccess,
        latencyMs: {
          connectP95: percentile(metrics.latencies.connect, 95),
          joinP95: percentile(metrics.latencies.join, 95),
          presenceFetchP95: percentile(metrics.latencies.presenceFetch, 95),
          presencePublishP95: percentile(metrics.latencies.presencePublish, 95),
        },
      },
      null,
      2,
    )}\n`,
  );
}

function percentile(values, percentileValue) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((percentileValue / 100) * sorted.length) - 1;

  return Number(sorted[Math.max(index, 0)].toFixed(2));
}
