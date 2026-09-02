import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";
import { GenericContainer, type StartedTestContainer } from "testcontainers";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(dirname, "..");

export default async function setup() {
  const postgres = await new PostgreSqlContainer("postgres:17-alpine")
    .withDatabase("lootlog_e2e")
    .withUsername("lootlog")
    .withPassword("lootlog")
    .start();
  const redis = await new GenericContainer("redis:7-alpine")
    .withExposedPorts(6379)
    .start();

  process.env.POSTGRESQL_CONNECTION_URI = postgres.getConnectionUri();
  process.env.REDIS_HOST = redis.getHost();
  process.env.REDIS_PORT = String(redis.getMappedPort(6379));
  process.env.REDIS_USERNAME = "";
  process.env.REDIS_PASSWORD = "";

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
