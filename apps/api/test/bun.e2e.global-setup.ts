import { registerIsolatedTestDatabase } from "./isolated-test-database.js";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { Effect } from "effect";
import { ApiDatabaseLive } from "../src/database/drizzle/database.js";
import { migrateApiDatabase } from "../src/database/drizzle/migrate.js";

export default async function setup() {
  const postgres = await new PostgreSqlContainer("postgres:17-alpine")
    .withDatabase("lootlog_e2e")
    .withUsername("lootlog")
    .withPassword("lootlog")
    .withStartupTimeout(60_000)
    .start();
  let redis: StartedTestContainer | undefined;
  try {
    redis = await new GenericContainer(
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
    registerIsolatedTestDatabase(postgres.getConnectionUri());
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

    await Effect.runPromise(
      migrateApiDatabase.pipe(Effect.scoped, Effect.provide(ApiDatabaseLive)),
    );

    return async () => {
      await Promise.all([redis?.stop(), postgres.stop()]);
    };
  } catch (error) {
    await Promise.allSettled([redis?.stop(), postgres.stop()]);
    throw error;
  }
}
