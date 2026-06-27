#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { io } from "socket.io-client";
import { msgpackParser } from "@lootlog/socket-parser";

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
  latencies: {
    connect: [],
    join: [],
    presenceFetch: [],
  },
};

if (!config.authHeader && !config.cookieHeader) {
  process.stderr.write(
    "Missing AUTH_TOKEN or AUTH_COOKIE. Put one in tools/k6/.secrets.local or export it in the shell.\n",
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
  metrics.connects === 0
) {
  process.exit(1);
}

function runConnection(index) {
  return new Promise((resolveConnection) => {
    const startedAt = performance.now();
    const socket = io(config.url, {
      auth: {
        devPermissionOverride: config.devPermissionOverride,
      },
      extraHeaders: buildHeaders(),
      parser: msgpackParser,
      path: config.path,
      reconnection: false,
      timeout: config.timeoutMs,
      transports: ["websocket"],
      withCredentials: true,
    });
    let presenceInterval;
    let resolved = false;

    const finish = () => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearInterval(presenceInterval);
      socket.disconnect();
      resolveConnection();
    };

    socket.on("connect", () => {
      metrics.connects += 1;
      metrics.latencies.connect.push(performance.now() - startedAt);
      const joinStartedAt = performance.now();

      socket.emit("join", { data: buildPlayer(index) });

      socket.once("join", (result) => {
        metrics.latencies.join.push(performance.now() - joinStartedAt);

        if (result?.status === "success") {
          metrics.joinSuccess += 1;
          const guildId = config.guildId || result.guildIds?.[0] || "";
          if (guildId) {
            fetchPresence(socket, guildId);
            presenceInterval = setInterval(() => {
              socket.emit("player-presence:update", {
                isAfk: false,
                mapId: config.mapId,
                mapName: config.mapName,
              });
              fetchPresence(socket, guildId);
            }, config.presenceIntervalMs);
          }
          return;
        }

        metrics.joinErrors += 1;
      });
    });

    socket.on("connect_error", (error) => {
      metrics.connectErrors += 1;
      process.stderr.write(`[gateway] connect_error: ${error.message}\n`);
      finish();
    });

    setTimeout(finish, config.durationMs);
  });
}

function fetchPresence(socket, guildId) {
  const startedAt = performance.now();
  socket.timeout(config.timeoutMs).emit(
    "online-players:presence:fetch",
    {
      guildId,
      world: config.world,
    },
    (error, response) => {
      metrics.latencies.presenceFetch.push(performance.now() - startedAt);

      if (error) {
        metrics.fetchErrors += 1;
        return;
      }

      if (response?.status === "forbidden") {
        metrics.fetchForbidden += 1;
        return;
      }

      if (response?.status === "success") {
        metrics.fetchSuccess += 1;
      }
    },
  );
}

function buildHeaders() {
  const headers = {
    Origin: config.origin,
  };

  if (config.authHeader) {
    headers.Authorization = config.authHeader;
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
    lvl: "300",
    name: `k6-${index}`,
    prof: "w",
    world: config.world,
  };
}

function buildConfig(cliArgs, secrets) {
  const authToken = secrets.AUTH_TOKEN || process.env.AUTH_TOKEN || "";
  const authCookie = secrets.AUTH_COOKIE || process.env.AUTH_COOKIE || "";
  const tokenHeader = authToken
    ? authToken.match(/^Bearer\s+/i)
      ? authToken
      : `Bearer ${authToken}`
    : "";

  return {
    authHeader: tokenHeader,
    connections: numberValue(cliArgs.connections, "K6_GATEWAY_CONNECTIONS", 1),
    cookieHeader: authCookie,
    devPermissionOverride: getDevPermissionOverride(secrets),
    durationMs: durationMs(
      cliArgs.duration || process.env.K6_GATEWAY_DURATION || "30s",
    ),
    guildId: process.env.K6_GUILD_ID || "",
    mapId: numberValue(cliArgs.mapId, "K6_GATEWAY_MAP_ID", 1),
    mapName: cliArgs.mapName || process.env.K6_GATEWAY_MAP_NAME || "Ithan",
    origin:
      cliArgs.origin || process.env.K6_GATEWAY_ORIGIN || "http://localhost",
    path:
      cliArgs.path ||
      process.env.K6_GATEWAY_SOCKET_PATH ||
      "/gateway/socket.io",
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

function getDevPermissionOverride(secrets) {
  const explicitOverride =
    secrets.DEV_PERMISSION_OVERRIDE ||
    process.env.K6_DEV_PERMISSION_OVERRIDE ||
    "";
  if (explicitOverride) {
    return explicitOverride;
  }

  const rawPermissions = process.env.K6_DEV_PERMISSIONS || "";
  const permissions = rawPermissions
    .split(",")
    .map((permission) => permission.trim())
    .filter(Boolean);

  if (
    permissions.length === 0 &&
    !["1", "true", "yes", "on"].includes(
      (process.env.K6_DEV_PERMISSION_OVERRIDE_ENABLED || "").toLowerCase(),
    )
  ) {
    return "";
  }

  const payload = {
    enabled: true,
    permissions: permissions.length > 0 ? permissions : ["OWNER"],
  };

  if (process.env.K6_DEV_PERMISSION_GUILD_ID || process.env.K6_GUILD_ID) {
    payload.guildId =
      process.env.K6_DEV_PERMISSION_GUILD_ID || process.env.K6_GUILD_ID;
  }

  return Buffer.from(JSON.stringify(payload)).toString("base64url");
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
        latencyMs: {
          connectP95: percentile(metrics.latencies.connect, 95),
          joinP95: percentile(metrics.latencies.join, 95),
          presenceFetchP95: percentile(metrics.latencies.presenceFetch, 95),
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
