import { initializeAuthMigrations } from "../src/database/migrations";

async function main() {
  const { drizzlePool } = await import("../src/database/drizzle");

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
