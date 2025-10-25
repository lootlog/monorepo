import { randomBytes } from "crypto";
import type { EnvVariable } from "./types.js";

const PASSWORD_LENGTH = 32;
const SECRET_KEY_LENGTH = 64;

const generateRandomString = (length: number): string => {
  return randomBytes(length).toString("hex").substring(0, length);
};

const generatePassword = (): string => {
  return generateRandomString(PASSWORD_LENGTH);
};

const generateSecretKey = (): string => {
  return randomBytes(SECRET_KEY_LENGTH).toString("base64");
};

const shouldGenerateValue = (key: string): boolean => {
  const lowerKey = key.toLowerCase();

  const userInputKeys = [
    "discord_bot_token",
    "discord_development_guild_id",
    "r2_access_key_id",
    "r2_secret_access_key",
    "r2_endpoint",
    "axiom_dataset",
    "axiom_token",
  ];

  return !userInputKeys.some((userKey) => lowerKey.includes(userKey));
};

const generateSmartDefault = (
  key: string,
  originalValue: string,
  sharedValues: Map<string, string>
): string => {
  const lowerKey = key.toLowerCase();

  if (sharedValues.has(key)) {
    return sharedValues.get(key)!;
  }

  if (lowerKey.includes("password") || lowerKey.includes("pass")) {
    return generatePassword();
  }

  if (
    lowerKey.includes("secret") ||
    lowerKey.includes("key") ||
    lowerKey.includes("token")
  ) {
    if (lowerKey.includes("master_key") || lowerKey.includes("masterkey")) {
      return generateSecretKey();
    }
    if (
      !lowerKey.includes("discord") &&
      !lowerKey.includes("r2") &&
      !lowerKey.includes("axiom")
    ) {
      return generateSecretKey();
    }
  }

  if (lowerKey.includes("port")) {
    const portMatch = originalValue.match(/^\d+$/);
    if (portMatch) {
      return originalValue;
    }
  }

  if (lowerKey.includes("host") && originalValue === "localhost") {
    return "localhost";
  }

  if (lowerKey.includes("url") || lowerKey.includes("uri")) {
    return originalValue;
  }

  if (lowerKey.includes("env") && originalValue === "local") {
    return "local";
  }

  if (
    lowerKey.includes("db_name") ||
    lowerKey.includes("database") ||
    lowerKey.includes("db_user")
  ) {
    return originalValue;
  }

  if (originalValue === "xxx" || originalValue === "your_" || originalValue.startsWith("your_")) {
    return originalValue;
  }

  return originalValue;
};

export const generateEnvValues = (
  variables: EnvVariable[],
  sharedValues: Map<string, string> = new Map(),
  autoMode: boolean = true
): EnvVariable[] => {
  return variables.map((variable) => {
    if (variable.isEmpty || variable.isComment || !variable.key) {
      return variable;
    }

    if (!autoMode || !shouldGenerateValue(variable.key)) {
      return variable;
    }

    const generatedValue = generateSmartDefault(
      variable.key,
      variable.value,
      sharedValues
    );

    return {
      ...variable,
      value: generatedValue,
    };
  });
};

export const extractSharedValues = (variables: EnvVariable[]): Map<string, string> => {
  const sharedValues = new Map<string, string>();

  const sharedKeys = [
    "USERS_DB_USER",
    "USERS_DB_PASSWORD",
    "USERS_DB_NAME",
    "LOOTLOG_DB_USER",
    "LOOTLOG_DB_PASSWORD",
    "LOOTLOG_DB_NAME",
    "BATTLE_LOG_DB_USER",
    "BATTLE_LOG_DB_PASSWORD",
    "BATTLE_LOG_DB_NAME",
    "RABBITMQ_DEFAULT_USER",
    "RABBITMQ_DEFAULT_PASS",
    "MEILISEARCH_MASTER_KEY",
    "REDIS_PASSWORD",
    "REDIS_USERNAME",
    "REDIS_HOST",
    "REDIS_PORT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_ENDPOINT",
    "R2_REGION",
    "R2_BUCKET_NAME",
  ];

  for (const variable of variables) {
    if (variable.key && sharedKeys.includes(variable.key)) {
      sharedValues.set(variable.key, variable.value);
    }
  }

  return sharedValues;
};

export const buildRabbitMQUri = (
  user: string,
  password: string,
  host: string = "localhost",
  port: string = "5672"
): string => {
  return `amqp://${user}:${password}@${host}:${port}`;
};

export const buildPostgreSQLUri = (
  user: string,
  password: string,
  database: string,
  host: string = "localhost",
  port: string = "5432"
): string => {
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};

export const enhanceVariablesWithDerivedValues = (
  variables: EnvVariable[],
  sharedValues: Map<string, string>
): EnvVariable[] => {
  return variables.map((variable) => {
    if (!variable.key) return variable;

    if (variable.key === "RABBITMQ_URI") {
      const user = sharedValues.get("RABBITMQ_DEFAULT_USER") || "rabbitmq_user";
      const password = sharedValues.get("RABBITMQ_DEFAULT_PASS") || "rabbitmq_password";
      return {
        ...variable,
        value: buildRabbitMQUri(user, password),
      };
    }

    if (variable.key === "POSTGRESQL_CONNECTION_URI") {
      const originalValue = variable.value;

      let user = "user";
      let password = "password";
      let database = "database";
      let port = "5432";

      if (originalValue.includes("battle_log") || originalValue.includes("5434")) {
        user = sharedValues.get("BATTLE_LOG_DB_USER") || "user";
        password = sharedValues.get("BATTLE_LOG_DB_PASSWORD") || "password";
        database = sharedValues.get("BATTLE_LOG_DB_NAME") || "battle_log";
        port = "5434";
      } else if (originalValue.includes("lootlog") || originalValue.includes("5433")) {
        user = sharedValues.get("LOOTLOG_DB_USER") || "user";
        password = sharedValues.get("LOOTLOG_DB_PASSWORD") || "password";
        database = sharedValues.get("LOOTLOG_DB_NAME") || "lootlog";
        port = "5433";
      } else if (originalValue.includes("users") || originalValue.includes("5432")) {
        user = sharedValues.get("USERS_DB_USER") || "user";
        password = sharedValues.get("USERS_DB_PASSWORD") || "password";
        database = sharedValues.get("USERS_DB_NAME") || "users";
        port = "5432";
      }

      return {
        ...variable,
        value: buildPostgreSQLUri(user, password, database, "localhost", port),
      };
    }

    return variable;
  });
};
