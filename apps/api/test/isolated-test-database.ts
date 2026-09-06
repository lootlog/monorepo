let isolatedConnectionUri: string | undefined;

/** Called only by the preload after starting its disposable PostgreSQL container. */
export const registerIsolatedTestDatabase = (connectionUri: string) => {
  if (new URL(connectionUri).pathname !== "/lootlog_e2e") {
    throw new Error(
      "The integration database must be a disposable lootlog_e2e database",
    );
  }
  isolatedConnectionUri = connectionUri;
};

export const requireIsolatedTestDatabase = () => {
  const configured = process.env.POSTGRESQL_CONNECTION_URI;
  if (!isolatedConnectionUri || configured !== isolatedConnectionUri) {
    throw new Error(
      "Refusing destructive integration tests without the isolated database preload. Run with --preload ./test/bun.e2e.setup.ts.",
    );
  }
  return isolatedConnectionUri;
};
