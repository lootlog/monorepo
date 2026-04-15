import { randomBytes } from "node:crypto";
import type { EnvVariable } from "../types.js";

const PASSWORD_LENGTH = 32;
const SECRET_KEY_LENGTH = 64;
const DEFAULT_POSTGRESQL_HOST = "localhost";
const DEFAULT_RABBITMQ_HOST = "localhost";
const DEFAULT_RABBITMQ_PORT = "5672";

const generateRandomString = (length: number): string => {
  return randomBytes(length).toString("hex").slice(0, length);
};

const generatePassword = (): string => {
  return generateRandomString(PASSWORD_LENGTH);
};

const generateSecretKey = (): string => {
  return randomBytes(SECRET_KEY_LENGTH).toString("base64");
};

const LOCAL_DATABASES = {
  users: {
    userKey: "USERS_DB_USER",
    passwordKey: "USERS_DB_PASSWORD",
    nameKey: "USERS_DB_NAME",
    port: "5432",
    fallbackName: "users",
  },
  lootlog: {
    userKey: "LOOTLOG_DB_USER",
    passwordKey: "LOOTLOG_DB_PASSWORD",
    nameKey: "LOOTLOG_DB_NAME",
    port: "5433",
    fallbackName: "lootlog",
  },
  battleLog: {
    userKey: "BATTLE_LOG_DB_USER",
    passwordKey: "BATTLE_LOG_DB_PASSWORD",
    nameKey: "BATTLE_LOG_DB_NAME",
    port: "5434",
    fallbackName: "battle_log",
  },
  activityLog: {
    userKey: "ACTIVITY_LOG_DB_USER",
    passwordKey: "ACTIVITY_LOG_DB_PASSWORD",
    nameKey: "ACTIVITY_LOG_DB_NAME",
    port: "5435",
    fallbackName: "activity_log",
  },
} as const;

type LocalDatabaseName = keyof typeof LOCAL_DATABASES;

const APP_DATABASES: Record<string, LocalDatabaseName> = {
  root: "lootlog",
  "apps/api": "lootlog",
  "apps/auth": "users",
  "apps/activity": "activityLog",
  "apps/battlelog-service": "battleLog",
  "apps/search": "lootlog",
};

const SHARED_KEYS = [
  "USERS_DB_USER",
  "USERS_DB_PASSWORD",
  "USERS_DB_NAME",
  "LOOTLOG_DB_USER",
  "LOOTLOG_DB_PASSWORD",
  "LOOTLOG_DB_NAME",
  "BATTLE_LOG_DB_USER",
  "BATTLE_LOG_DB_PASSWORD",
  "BATTLE_LOG_DB_NAME",
  "ACTIVITY_LOG_DB_USER",
  "ACTIVITY_LOG_DB_PASSWORD",
  "ACTIVITY_LOG_DB_NAME",
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
] as const;

const SHARED_KEY_SET = new Set<string>(SHARED_KEYS);

const EXTERNAL_VALUE_KEYS = [
  "AXIOM_DATASET",
  "AXIOM_TOKEN",
  "DISCORD_BOT_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "DISCORD_DEVELOPMENT_GUILD_ID",
  "DISCORD_DEVELOPMENT_USER_ID",
  "OPTIMIZE_API_KEY",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
  "SEEDING_USER_ID",
] as const;

const shouldGenerateValue = (key: string): boolean => {
  return !EXTERNAL_VALUE_KEYS.some((externalKey) => key === externalKey);
};

const generateSmartDefault = (
  key: string,
  originalValue: string,
  sharedValues: Map<string, string>,
): string => {
  const lowerKey = key.toLowerCase();
  const sharedValue = sharedValues.get(key);

  if (sharedValue !== undefined) {
    return sharedValue;
  }

  if (!shouldGenerateValue(key)) {
    return originalValue;
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

  if (
    originalValue === "xxx" ||
    originalValue === "your_" ||
    originalValue.startsWith("your_")
  ) {
    return originalValue;
  }

  return originalValue;
};

export const generateEnvValues = (
  variables: EnvVariable[],
  sharedValues: Map<string, string> = new Map(),
  autoMode: boolean = true,
): EnvVariable[] => {
  return variables.map((variable) => {
    if (variable.isEmpty || variable.isComment || !variable.key) {
      return variable;
    }

    if (!autoMode) {
      return variable;
    }

    const generatedValue = generateSmartDefault(
      variable.key,
      variable.value,
      sharedValues,
    );

    return {
      ...variable,
      value: generatedValue,
    };
  });
};

export const extractSharedValues = (
  variables: EnvVariable[],
): Map<string, string> => {
  const sharedValues = new Map<string, string>();

  for (const variable of variables) {
    if (variable.key && SHARED_KEY_SET.has(variable.key)) {
      sharedValues.set(variable.key, variable.value);
    }
  }

  return sharedValues;
};

const buildRabbitMQUri = (
  user: string,
  password: string,
  host: string = DEFAULT_RABBITMQ_HOST,
  port: string = DEFAULT_RABBITMQ_PORT,
): string => {
  return `amqp://${user}:${password}@${host}:${port}`;
};

const buildPostgreSQLUri = (
  user: string,
  password: string,
  database: string,
  host: string = DEFAULT_POSTGRESQL_HOST,
  port: string = "5432",
): string => {
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};

const getSharedValue = (
  sharedValues: Map<string, string>,
  key: string,
  fallback: string,
): string => {
  return sharedValues.get(key) ?? fallback;
};

const getDatabaseName = (
  envFileName: string | undefined,
  originalValue: string,
): LocalDatabaseName => {
  const appDatabase = envFileName ? APP_DATABASES[envFileName] : undefined;

  if (appDatabase) {
    return appDatabase;
  }

  if (
    originalValue.includes("activity_log") ||
    originalValue.includes("5435")
  ) {
    return "activityLog";
  }

  if (originalValue.includes("battle_log") || originalValue.includes("5434")) {
    return "battleLog";
  }

  if (originalValue.includes("lootlog") || originalValue.includes("5433")) {
    return "lootlog";
  }

  if (originalValue.includes("users") || originalValue.includes("5432")) {
    return "users";
  }

  return "lootlog";
};

const getDatabaseCredentials = (
  sharedValues: Map<string, string>,
  databaseName: LocalDatabaseName,
) => {
  const database = LOCAL_DATABASES[databaseName];

  return {
    user: getSharedValue(sharedValues, database.userKey, "user"),
    password: getSharedValue(sharedValues, database.passwordKey, "password"),
    database: getSharedValue(
      sharedValues,
      database.nameKey,
      database.fallbackName,
    ),
    port: database.port,
  };
};

const deriveAuthPostgresValue = (
  key: string,
  sharedValues: Map<string, string>,
): string | null => {
  const credentials = getDatabaseCredentials(sharedValues, "users");

  if (key === "POSTGRESQL_HOST") {
    return DEFAULT_POSTGRESQL_HOST;
  }

  if (key === "POSTGRESQL_PORT") {
    return credentials.port;
  }

  if (key === "POSTGRESQL_USER") {
    return credentials.user;
  }

  if (key === "POSTGRESQL_PASSWORD") {
    return credentials.password;
  }

  if (key === "POSTGRESQL_DATABASE") {
    return credentials.database;
  }

  return null;
};

export const enhanceVariablesWithDerivedValues = (
  variables: EnvVariable[],
  sharedValues: Map<string, string>,
  envFileName?: string,
): EnvVariable[] => {
  return variables.map((variable) => {
    if (!variable.key) return variable;

    if (variable.key === "RABBITMQ_URI") {
      const user = sharedValues.get("RABBITMQ_DEFAULT_USER") ?? "rabbitmq_user";
      const password =
        sharedValues.get("RABBITMQ_DEFAULT_PASS") ?? "rabbitmq_password";
      return {
        ...variable,
        value: buildRabbitMQUri(user, password),
      };
    }

    if (variable.key === "MEILISEARCH_API_KEY") {
      return {
        ...variable,
        value: getSharedValue(
          sharedValues,
          "MEILISEARCH_MASTER_KEY",
          variable.value,
        ),
      };
    }

    if (variable.key === "POSTGRESQL_CONNECTION_URI") {
      const databaseName = getDatabaseName(envFileName, variable.value);
      const credentials = getDatabaseCredentials(sharedValues, databaseName);

      return {
        ...variable,
        value: buildPostgreSQLUri(
          credentials.user,
          credentials.password,
          credentials.database,
          DEFAULT_POSTGRESQL_HOST,
          credentials.port,
        ),
      };
    }

    const authPostgresValue = deriveAuthPostgresValue(
      variable.key,
      sharedValues,
    );
    if (envFileName === "apps/auth" && authPostgresValue !== null) {
      return {
        ...variable,
        value: authPostgresValue,
      };
    }

    return variable;
  });
};
