import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GenericContainer, Wait } from "testcontainers";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const activityRoot = path.resolve(dirname, "..");

export default async function setup() {
  const postgres = await new GenericContainer(
    "timescale/timescaledb:latest-pg17",
  )
    .withEnvironment({
      POSTGRES_DB: "activity_e2e",
      POSTGRES_PASSWORD: "lootlog",
      POSTGRES_USER: "lootlog",
    })
    .withExposedPorts(5432)
    .withWaitStrategy(
      Wait.forLogMessage(/database system is ready to accept connections/u, 2),
    )
    .start();

  process.env.POSTGRESQL_CONNECTION_URI = `postgresql://lootlog:lootlog@${postgres.getHost()}:${postgres.getMappedPort(5432)}/activity_e2e`;
  execFileSync(
    "pnpm",
    ["exec", "prisma", "db", "migrate", "--advance-ref", "db"],
    {
      cwd: activityRoot,
      env: process.env,
      stdio: "inherit",
    },
  );

  return async () => postgres.stop();
}
