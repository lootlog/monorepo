const unreachableHost = "run-integration-tests-with-test-integration.invalid";

Object.assign(process.env, {
  POSTGRESQL_CONNECTION_URI: `postgresql://${unreachableHost}:1/unreachable`,
  RABBITMQ_URI: `amqp://${unreachableHost}:1`,
  REDIS_HOST: unreachableHost,
  REDIS_PORT: "1",
  REDIS_USERNAME: "",
  REDIS_PASSWORD: "",
});
