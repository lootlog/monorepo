import { Config, Context, Effect, Layer, Redacted, Schema } from "effect";

import {
  ChromeExtensionOrigin,
  FirefoxExtensionOrigin,
} from "@lootlog/schema/browser-extension";

export interface GatewayConfiguration {
  readonly environment: string;
  readonly port: number;
  readonly serviceName: string;
  readonly serviceNamespace: string;
  readonly apiUrl: string;
  readonly authUrl?: string;
  readonly apiKeyStatusSecret?: Redacted.Redacted<string>;
  readonly margonemSigningKeyUrl: string;
  readonly rabbitmqUri: Redacted.Redacted<string>;
  readonly activityEventSignatureSecret: Redacted.Redacted<string>;
  readonly redis: {
    readonly host: string;
    readonly port: number;
    readonly username: string;
    readonly password: Redacted.Redacted<string>;
    readonly keyPrefix: string;
  };
  readonly websocketPath: string;
  readonly allowedWebOrigins: ReadonlySet<string>;
  readonly allowedExtensionOrigins: ReadonlySet<string>;
  readonly maxBackpressureBytes: number;
}

const splitOrigins = (value: string): ReadonlySet<string> =>
  new Set(
    value
      .split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter((origin) => origin.length > 0),
  );

export const loadGatewayConfiguration = Effect.gen(function* () {
  const environment = yield* Config.String("ENV").pipe(
    Config.withDefault("local"),
  );

  const serviceName = yield* Config.String("SERVICE_NAME").pipe(
    Config.withDefault("gateway"),
  );

  const redisPassword = yield* Config.Redacted("REDIS_PASSWORD");

  return {
    environment,
    port: yield* Config.Port("PORT"),
    serviceName,
    serviceNamespace: yield* Config.String("SERVICE_NAMESPACE").pipe(
      Config.withDefault("local"),
    ),
    authUrl: yield* Config.String("AUTH_URL").pipe(Config.withDefault("")),
    apiKeyStatusSecret: yield* Config.Redacted("API_KEY_STATUS_SECRET").pipe(
      Config.withDefault(Redacted.make("")),
    ),
    apiUrl: (yield* Config.URL("API_URL")).toString().replace(/\/$/, ""),
    margonemSigningKeyUrl: (yield* Config.URL("MARGONEM_SIGNING_KEY_URL").pipe(
      Config.withDefault(
        new URL("https://staticinfo.margonem.pl/.well-known/signing-key.pem"),
      ),
    )).toString(),
    rabbitmqUri: yield* Config.Redacted("RABBITMQ_URI"),
    activityEventSignatureSecret: yield* Config.Redacted(
      "ACTIVITY_EVENT_SIGNATURE_SECRET",
    ),
    redis: {
      host: yield* Config.String("REDIS_HOST"),
      port: yield* Config.Port("REDIS_PORT"),
      username: yield* Config.String("REDIS_USERNAME"),
      password: redisPassword,
      keyPrefix: `${serviceName}:${environment}`,
    },
    websocketPath: yield* Config.String("WEBSOCKET_PATH").pipe(
      Config.withDefault("/ws"),
    ),
    allowedWebOrigins: splitOrigins(
      yield* Config.String("ALLOWED_WEB_ORIGINS").pipe(
        Config.withDefault("http://localhost,http://localhost:3000"),
      ),
    ),
    allowedExtensionOrigins: splitOrigins(
      yield* Config.schema(
        Schema.String.check(
          Schema.makeFilter(
            (value) =>
              [...splitOrigins(value)].every(
                Schema.is(
                  Schema.Union([ChromeExtensionOrigin, FirefoxExtensionOrigin]),
                ),
              ),
            {
              expected:
                "comma-separated exact Chrome or Firefox extension origins",
            },
          ),
        ),
        "ALLOWED_EXTENSION_ORIGINS",
      ).pipe(Config.withDefault("")),
    ),
    maxBackpressureBytes: yield* Config.Number(
      "WEBSOCKET_MAX_BACKPRESSURE_BYTES",
    ).pipe(Config.withDefault(1_048_576)),
  } satisfies GatewayConfiguration;
});

export class GatewayConfig extends Context.Service<
  GatewayConfig,
  GatewayConfiguration
>()("@lootlog/gateway/Config") {
  static readonly layer = Layer.effect(GatewayConfig, loadGatewayConfiguration);
}
