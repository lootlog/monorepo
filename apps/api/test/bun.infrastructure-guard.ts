// Bun loads `.env` into every `bun test` run, so an integration suite started
// without `--preload ./test/bun.e2e.setup.ts` would truncate and flush the
// developer's real Postgres and Redis. This preload runs first from
// bunfig.toml and points every infrastructure address at a host that never
// resolves; the integration preload replaces them with its containers.
const unreachableHost = "run-integration-tests-with-test-integration.invalid";

Object.assign(process.env, {
  POSTGRESQL_CONNECTION_URI: `postgresql://${unreachableHost}:1/unreachable`,
  RABBITMQ_URI: `amqp://${unreachableHost}:1`,
  REDIS_HOST: unreachableHost,
  REDIS_PORT: "1",
  REDIS_USERNAME: "",
  REDIS_PASSWORD: "",
});
