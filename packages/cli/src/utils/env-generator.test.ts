import assert from "node:assert/strict";
import { describe, test } from "bun:test";
import type { EnvVariable } from "../types.js";
import {
  enhanceVariablesWithDerivedValues,
  extractSharedValues,
  generateEnvValues,
} from "./env-generator.js";

const envVariable = (key: string, value: string): EnvVariable => ({
  key,
  value,
  isComment: false,
  isEmpty: false,
  originalLine: `${key}=${value}`,
});

const sharedValues = new Map<string, string>([
  ["USERS_DB_USER", "users_user"],
  ["USERS_DB_PASSWORD", "users_password"],
  ["USERS_DB_NAME", "users_db"],
  ["LOOTLOG_DB_USER", "lootlog_user"],
  ["LOOTLOG_DB_PASSWORD", "lootlog_password"],
  ["LOOTLOG_DB_NAME", "lootlog_db"],
  ["BATTLE_LOG_DB_USER", "battlelog_user"],
  ["BATTLE_LOG_DB_PASSWORD", "battlelog_password"],
  ["BATTLE_LOG_DB_NAME", "battlelog_db"],
  ["ACTIVITY_LOG_DB_USER", "activity_user"],
  ["ACTIVITY_LOG_DB_PASSWORD", "activity_password"],
  ["ACTIVITY_LOG_DB_NAME", "activity_db"],
  ["RABBITMQ_DEFAULT_USER", "rabbit_user"],
  ["RABBITMQ_DEFAULT_PASS", "rabbit_password"],
  ["MEILISEARCH_MASTER_KEY", "meili_master_key"],
  ["REDIS_PASSWORD", "redis_password"],
]);

const getValue = (variables: EnvVariable[], key: string): string => {
  const variable = variables.find((item) => item.key === key);

  assert.ok(variable, `Missing ${key}`);

  return variable.value;
};

const assertDerivedAppValues = (): void => {
  const apiVariables = enhanceVariablesWithDerivedValues(
    [
      envVariable(
        "POSTGRESQL_CONNECTION_URI",
        "postgresql://user:password@localhost:5433/lootlog",
      ),
      envVariable("RABBITMQ_URI", "amqp://user:password@localhost:5672"),
      envVariable("REDIS_PASSWORD", "redis_password"),
    ],
    sharedValues,
    "apps/api",
  );

  assert.equal(
    getValue(apiVariables, "POSTGRESQL_CONNECTION_URI"),
    "postgresql://lootlog_user:lootlog_password@localhost:5433/lootlog_db",
  );
  assert.equal(
    getValue(apiVariables, "RABBITMQ_URI"),
    "amqp://rabbit_user:rabbit_password@localhost:5672",
  );
  assert.equal(getValue(apiVariables, "REDIS_PASSWORD"), "redis_password");

  const activityVariables = enhanceVariablesWithDerivedValues(
    [
      envVariable(
        "POSTGRESQL_CONNECTION_URI",
        "postgresql://user:password@localhost:5435/activity_log",
      ),
    ],
    sharedValues,
    "apps/activity",
  );

  assert.equal(
    getValue(activityVariables, "POSTGRESQL_CONNECTION_URI"),
    "postgresql://activity_user:activity_password@localhost:5435/activity_db",
  );

  const battlelogVariables = enhanceVariablesWithDerivedValues(
    [
      envVariable(
        "POSTGRESQL_CONNECTION_URI",
        "postgresql://user:password@localhost:5434/battle_log",
      ),
    ],
    sharedValues,
    "apps/battlelog",
  );

  assert.equal(
    getValue(battlelogVariables, "POSTGRESQL_CONNECTION_URI"),
    "postgresql://battlelog_user:battlelog_password@localhost:5434/battlelog_db",
  );
};

const assertAuthValues = (): void => {
  const authVariables = enhanceVariablesWithDerivedValues(
    [
      envVariable("POSTGRESQL_HOST", "localhost"),
      envVariable("POSTGRESQL_PORT", "5432"),
      envVariable("POSTGRESQL_USER", "user"),
      envVariable("POSTGRESQL_PASSWORD", "password"),
      envVariable("POSTGRESQL_DATABASE", "users"),
    ],
    sharedValues,
    "apps/auth",
  );

  assert.equal(getValue(authVariables, "POSTGRESQL_HOST"), "localhost");
  assert.equal(getValue(authVariables, "POSTGRESQL_PORT"), "5432");
  assert.equal(getValue(authVariables, "POSTGRESQL_USER"), "users_user");
  assert.equal(
    getValue(authVariables, "POSTGRESQL_PASSWORD"),
    "users_password",
  );
  assert.equal(getValue(authVariables, "POSTGRESQL_DATABASE"), "users_db");
};

const assertSearchValues = (): void => {
  const searchVariables = enhanceVariablesWithDerivedValues(
    [
      envVariable("MEILISEARCH_API_KEY", "meilisearch_master_key"),
      envVariable(
        "POSTGRESQL_CONNECTION_URI",
        "postgresql://user:password@localhost:5433/lootlog",
      ),
      envVariable("RABBITMQ_URI", "amqp://user:password@localhost:5672"),
    ],
    sharedValues,
    "apps/search",
  );

  assert.equal(
    getValue(searchVariables, "MEILISEARCH_API_KEY"),
    "meili_master_key",
  );
  assert.equal(
    getValue(searchVariables, "POSTGRESQL_CONNECTION_URI"),
    "postgresql://lootlog_user:lootlog_password@localhost:5433/lootlog_db",
  );
  assert.equal(
    getValue(searchVariables, "RABBITMQ_URI"),
    "amqp://rabbit_user:rabbit_password@localhost:5672",
  );
};

const assertGeneratedRootValuesCanBeReused = (): void => {
  const generatedRootVariables = generateEnvValues(
    [
      envVariable("USERS_DB_PASSWORD", "password"),
      envVariable("LOOTLOG_DB_PASSWORD", "password"),
      envVariable("BATTLE_LOG_DB_PASSWORD", "password"),
      envVariable("ACTIVITY_LOG_DB_PASSWORD", "password"),
      envVariable("RABBITMQ_DEFAULT_PASS", "rabbitmq_password"),
      envVariable("MEILISEARCH_MASTER_KEY", "meilisearch_master_key"),
      envVariable("REDIS_PASSWORD", "redis_password"),
    ],
    new Map(),
  );

  const extractedSharedValues = extractSharedValues(generatedRootVariables);

  assert.equal(
    extractedSharedValues.get("USERS_DB_PASSWORD"),
    getValue(generatedRootVariables, "USERS_DB_PASSWORD"),
  );
  assert.equal(
    extractedSharedValues.get("ACTIVITY_LOG_DB_PASSWORD"),
    getValue(generatedRootVariables, "ACTIVITY_LOG_DB_PASSWORD"),
  );
  assert.equal(
    extractedSharedValues.get("MEILISEARCH_MASTER_KEY"),
    getValue(generatedRootVariables, "MEILISEARCH_MASTER_KEY"),
  );
};

describe("environment value generation", () => {
  test("derives application connection values", assertDerivedAppValues);
  test("derives Auth database values", assertAuthValues);
  test("derives Search integration values", assertSearchValues);
  test("reuses generated root values", assertGeneratedRootValuesCanBeReused);
});
