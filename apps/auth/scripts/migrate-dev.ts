import { runAuthMigrations } from "../src/database/migrations";
import { drizzlePool } from "../src/database/drizzle";

async function main() {
  try {
    await runAuthMigrations(drizzlePool);
    console.log("Auth local migrations applied.");
  } finally {
    await drizzlePool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
