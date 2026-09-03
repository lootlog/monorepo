import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(dirname, "..");

export default async function setup() {
  const postgres = await new PostgreSqlContainer("postgres:17-alpine")
    .withDatabase("lootlog_e2e")
    .withUsername("lootlog")
    .withPassword("lootlog")
    .withStartupTimeout(60_000)
    .start();
  const redis = await new GenericContainer(
    "docker.dragonflydb.io/dragonflydb/dragonfly:v1.34.1",
  )
    .withCommand([
      "--requirepass=test",
      "--logtostderr",
      "--proactor_threads=2",
    ])
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(60_000)
    .start();

  process.env.POSTGRESQL_CONNECTION_URI = postgres.getConnectionUri();
  process.env.PORT = "4000";
  process.env.SERVICE_NAME = "api-e2e";
  process.env.SERVICE_NAMESPACE = "test";
  process.env.RABBITMQ_URI = "amqp://unused.test:5672";
  process.env.REDIS_HOST = redis.getHost();
  process.env.REDIS_PORT = String(redis.getMappedPort(6379));
  process.env.REDIS_USERNAME = "default";
  process.env.REDIS_PASSWORD = "test";
  process.env.AUTH_SERVICE_URL = "http://auth.test";
  process.env.BATTLELOG_SERVICE_URL = "http://battlelog.test";
  process.env.DISCORD_BOT_SERVICE_URL = "http://discord-bot.test";
  process.env.RESERVATIONS_CARDS_URL = "http://cards.test";
  process.env.MAPS_API_URL = "http://maps.test";

  const migrationsRoot = path.join(apiRoot, "drizzle/migrations");
  const baselineDirectories = await readdir(migrationsRoot);
  const baselineDirectory = baselineDirectories.at(0);
  if (baselineDirectory === undefined) {
    throw new Error("API Drizzle baseline migration is missing");
  }
  const migrationSql = await readFile(
    path.join(migrationsRoot, baselineDirectory, "migration.sql"),
    "utf8",
  );
  const client = new Client({ connectionString: postgres.getConnectionUri() });
  await client.connect();
  try {
    await client.query(migrationSql);
  } finally {
    await client.end();
  }

  return async () => {
    await stopContainer(redis);
    await postgres.stop();
  };
}

async function stopContainer(container: StartedTestContainer) {
  await container.stop();
}
