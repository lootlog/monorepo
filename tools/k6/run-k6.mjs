#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const k6Script = resolve(scriptDir, "run.js");
const defaultSecretsPath = resolve(scriptDir, ".secrets.local");
const validServices = new Set([
  "activity",
  "api",
  "auth",
  "battlelog",
  "battlelog-service",
  "search",
  "all",
]);

const parsed = parseArgs(process.argv.slice(2));
const env = { ...process.env };

if (parsed.service) {
  if (!validServices.has(parsed.service)) {
    process.stderr.write(
      `Unknown service "${parsed.service}". Expected one of: ${Array.from(validServices).join(", ")}\n`,
    );
    process.exit(1);
  }
  env.K6_SERVICE = parsed.service;
}

if (parsed.profile) {
  env.K6_PROFILE = parsed.profile;
}

if (parsed.targetEnv) {
  env.K6_ENV = parsed.targetEnv;
}

const k6Args = ["run"];
const secretsPath = parsed.secretsPath
  ? resolve(repoRoot, parsed.secretsPath)
  : defaultSecretsPath;

if (!parsed.noSecrets && existsSync(secretsPath)) {
  k6Args.push(`--secret-source=file=${secretsPath}`);
} else if (!parsed.noSecrets) {
  console.warn(
    `[k6] ${secretsPath} does not exist. Continuing with exported AUTH_TOKEN/AUTH_COOKIE if present.`,
  );
}

k6Args.push(...parsed.k6Args, k6Script);

const result = spawnSync("k6", k6Args, {
  cwd: repoRoot,
  env,
  stdio: "inherit",
});

if (result.error) {
  process.stderr.write(`${result.error.message}\n`);
  process.exit(1);
}

process.exit(result.status ?? 1);

function parseArgs(args) {
  const parsedArgs = {
    k6Args: [],
    noSecrets: false,
    profile: "",
    secretsPath: "",
    service: "",
    targetEnv: "",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--") {
      parsedArgs.k6Args.push(...args.slice(index + 1));
      break;
    }

    if (arg === "--no-secrets") {
      parsedArgs.noSecrets = true;
      continue;
    }

    const next = args[index + 1];

    if (arg === "--service" && next) {
      parsedArgs.service = next;
      index += 1;
      continue;
    }

    if (arg === "--profile" && next) {
      parsedArgs.profile = next;
      index += 1;
      continue;
    }

    if (arg === "--target-env" && next) {
      parsedArgs.targetEnv = next;
      index += 1;
      continue;
    }

    if (arg === "--secrets" && next) {
      parsedArgs.secretsPath = next;
      index += 1;
      continue;
    }

    parsedArgs.k6Args.push(arg);
  }

  return parsedArgs;
}
