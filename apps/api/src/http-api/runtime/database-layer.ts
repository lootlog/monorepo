import { Layer } from "effect";
import { ApiDatabaseLive } from "#src/database/drizzle/database";

/**
 * The HTTP API host's scoped Drizzle infrastructure. The underlying PostgreSQL
 * connection is acquired and released by the existing Effect SQL layer.
 */
export const HttpApiDatabaseLive = ApiDatabaseLive.pipe(
  Layer.withSpan("lootlog.api.database.initialize"),
);
