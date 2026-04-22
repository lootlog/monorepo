import { initializeAuthMigrations } from "../src/database/migrations";
import { drizzlePool } from "../src/database/drizzle";

async function main() {
  try {
    await initializeAuthMigrations(drizzlePool);
    console.log("Auth migrations initialized.");
  } finally {
    await drizzlePool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
