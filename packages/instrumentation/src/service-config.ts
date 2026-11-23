import {
  RuntimeEnvironment,
  RuntimeEnvironmentSchema,
} from "@lootlog/schema/runtime-environment";
import {
  type DeploymentEnvironment,
  webAppOrigin,
} from "@lootlog/schema/api-services";
import { Config, Option, Redacted, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";

export class InvalidServiceConfiguration extends TaggedErrorClass<
  InvalidServiceConfiguration,
  { readonly brand: unique symbol }
>()("InvalidServiceConfiguration", { message: Schema.String }) {}

export interface BaseServiceConfiguration {
  readonly environment: RuntimeEnvironment;
  readonly port: number;
  readonly serviceName: string;
  readonly serviceNamespace: string;
}

export const runtimeEnvironmentConfig = Config.schema(
  RuntimeEnvironmentSchema,
  "ENV",
).pipe(Config.withDefault(RuntimeEnvironment.LOCAL));

export const baseServiceConfig = (
  defaultServiceName: string,
): Config.Config<BaseServiceConfiguration> =>
  Config.all({
    environment: runtimeEnvironmentConfig,
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

const WEB_APP_DEPLOYMENTS = new Map<RuntimeEnvironment, DeploymentEnvironment>([
  [RuntimeEnvironment.PROD, "production"],
  [RuntimeEnvironment.DEV, "development"],
]);

export const webAppUrlConfig: Config.Config<string> = Config.all({
  environment: runtimeEnvironmentConfig,
  url: Config.option(Config.String("WEB_APP_URL")),
}).pipe(
  Config.map(({ environment, url }) =>
    Option.getOrElse(url, () =>
      webAppOrigin(WEB_APP_DEPLOYMENTS.get(environment) ?? "local"),
    ),
  ),
);
