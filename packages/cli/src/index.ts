import { readFileSync } from "fs";
import { createEnvFile } from "./create-env-file.js";

import { fileURLToPath } from "url";
import { dirname } from "path";
import { replaceEnvWithValues } from "./replace-env-with-values.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVICES_SAMPLE_ENV_PATH = "../../../../.env.sample";
const SERVICE_ENV_PATH = "../../../../.env";

const AUTH_SERVICE_SAMPLE_ENV_PATH = "../../../../apps/auth/.env.sample";
const AUTH_SERVICE_ENV_PATH = "../../../../apps/auth/.env";

const SEARCH_SERVICE_SAMPLE_ENV_PATH = "../../../../apps/search/.env.sample";
const SEARCH_SERVICE_ENV_PATH = "../../../../apps/search/.env";

const API_SERVICE_SAMPLE_ENV_PATH = "../../../../apps/api/.env.sample";
const API_SERVICE_ENV_PATH = "../../../../apps/api/.env";

const WEB_CLIENT_SAMPLE_ENV_PATH = "../../../../apps/web/.env.sample";
const WEB_CLIENT_ENV_PATH = "../../../../apps/web/.env";

const GAME_CLIENT_SAMPLE_ENV_PATH = "../../../../apps/game-client/.env.sample";
const GAME_CLIENT_ENV_PATH = "../../../../apps/game-client/.env";

const servicesSampleEnv = readFileSync(
  __dirname + SERVICES_SAMPLE_ENV_PATH,
  "utf-8"
);
const authServiceSampleEnv = readFileSync(
  __dirname + AUTH_SERVICE_SAMPLE_ENV_PATH,
  "utf-8"
);
const searchServiceSampleEnv = readFileSync(
  __dirname + SEARCH_SERVICE_SAMPLE_ENV_PATH,
  "utf-8"
);
const apiServiceSampleEnv = readFileSync(
  __dirname + API_SERVICE_SAMPLE_ENV_PATH,
  "utf-8"
);
const webClientSampleEnv = readFileSync(
  __dirname + WEB_CLIENT_SAMPLE_ENV_PATH,
  "utf-8"
);
const gameClientSampleEnv = readFileSync(
  __dirname + GAME_CLIENT_SAMPLE_ENV_PATH,
  "utf-8"
);

console.log("\n");
console.log("Creating env files for Lootlog Base Services...");
const servicesEnv = await replaceEnvWithValues(servicesSampleEnv);
await createEnvFile(__dirname + SERVICE_ENV_PATH, servicesEnv);

console.log("\n");
console.log("Creating env files for Web Client...");
const webClientEnv = await replaceEnvWithValues(webClientSampleEnv);
await createEnvFile(__dirname + WEB_CLIENT_ENV_PATH, webClientEnv);

console.log("\n");
console.log("Creating env files for Game Client...");
const gameClientEnv = await replaceEnvWithValues(gameClientSampleEnv);
await createEnvFile(__dirname + GAME_CLIENT_ENV_PATH, gameClientEnv);

console.log("\n");
console.log("Creating env files for Api Service...");
const apiServiceEnv = await replaceEnvWithValues(apiServiceSampleEnv);
await createEnvFile(__dirname + API_SERVICE_ENV_PATH, apiServiceEnv);

console.log("\n");
console.log("Creating env files for Search Service...");
const searchServiceEnv = await replaceEnvWithValues(searchServiceSampleEnv);
await createEnvFile(__dirname + SEARCH_SERVICE_ENV_PATH, searchServiceEnv);

console.log("\n");
console.log("Creating env files for Auth Service...");
const authServiceEnv = await replaceEnvWithValues(authServiceSampleEnv);

await createEnvFile(__dirname + AUTH_SERVICE_ENV_PATH, authServiceEnv);
