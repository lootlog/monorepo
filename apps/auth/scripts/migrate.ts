import { runAuthMigrations } from "../src/database/migrations.js";

async function main() {
  const { drizzlePool } = await import("../src/database/drizzle.js");

  try {
    await runAuthMigrations();
    console.log("Auth migrations applied.");
  } finally {
    await drizzlePool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
