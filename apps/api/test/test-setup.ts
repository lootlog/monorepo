export function getTestDatabaseUrl(): string {
  return process.env.POSTGRESQL_CONNECTION_URI || "";
}

export function getTestRedisConfig() {
  return {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || "",
  };
}
