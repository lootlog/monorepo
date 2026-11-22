import {
  RuntimeEnvironment,
  RuntimeEnvironmentSchema,
} from "@lootlog/schema/runtime-environment";
import { Config, Redacted } from "effect";

export interface BaseServiceConfiguration {
  readonly environment: RuntimeEnvironment;
  readonly port: number;
  readonly serviceName: string;
  readonly serviceNamespace: string;
}

export const baseServiceConfig = (
  defaultServiceName: string,
): Config.Config<BaseServiceConfiguration> =>
  Config.all({
    environment: Config.schema(RuntimeEnvironmentSchema, "ENV").pipe(
      Config.withDefault(RuntimeEnvironment.LOCAL),
    ),
    port: Config.Port("PORT"),
    serviceName: Config.String("SERVICE_NAME").pipe(
      Config.withDefault(defaultServiceName),
    ),
    serviceNamespace: Config.String("SERVICE_NAMESPACE").pipe(
      Config.withDefault("local"),
    ),
  });

export const redisUrlConfig: Config.Config<Redacted.Redacted<string>> =
  Config.all({
    host: Config.String("REDIS_HOST"),
    port: Config.Port("REDIS_PORT").pipe(Config.withDefault(6379)),
    username: Config.String("REDIS_USERNAME").pipe(
      Config.withDefault("default"),
    ),
    password: Config.Redacted("REDIS_PASSWORD").pipe(
      Config.withDefault(Redacted.make("")),
    ),
  }).pipe(
    Config.map(({ host, port, username, password }) =>
      Redacted.make(
        `redis://${encodeURIComponent(username)}:${encodeURIComponent(Redacted.value(password))}@${host}:${port}`,
      ),
    ),
  );

export const commaSeparatedConfig = (
  name: string,
): Config.Config<ReadonlyArray<string>> =>
  Config.String(name).pipe(
    Config.map((value) =>
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry !== ""),
    ),
  );
