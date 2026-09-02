import { Effect } from "effect";
import { authConfig } from "#src/config/env";
import { createAuthDatabase } from "#src/database/drizzle";
import { createLootlogAuth } from "./better-auth.js";

const config = Effect.runSync(authConfig);
const database = createAuthDatabase(config);

/** Better Auth CLI entrypoint. Redis is intentionally not required for schema work. */
export const auth = createLootlogAuth({
  config,
  database: database.db,
});
