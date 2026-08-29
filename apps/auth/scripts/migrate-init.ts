import { initializeAuthMigrations } from "../src/database/migrations.js";

async function main() {
  const { drizzlePool } = await import("../src/database/drizzle.js");

  try {
    await initializeAuthMigrations();
    console.log("Auth migrations initialized.");
  } finally {
    await drizzlePool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
