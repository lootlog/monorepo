import { Config, Context, Effect, Layer, Redacted } from "effect";

export interface GatewayConfiguration {
  readonly environment: string;
  readonly port: number;
  readonly serviceName: string;
  readonly serviceNamespace: string;
  readonly apiUrl: string;
  readonly authUrl: string;
  readonly margonemSigningKeyUrl: string;
  readonly margonemAccountProofRequired: boolean;
  readonly rabbitmqUri: string;
  readonly activityEventSignatureSecret: string;
  readonly redis: {
    readonly host: string;
    readonly port: number;
    readonly username: string;
    readonly password: string;
    readonly keyPrefix: string;
  };
  readonly websocketPath: string;
  readonly allowedWebOrigins: ReadonlySet<string>;
  readonly maxBackpressureBytes: number;
  readonly maxBackpressureStrikes: number;
}

const splitOrigins = (value: string): ReadonlySet<string> =>
  new Set(
    value
      .split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter((origin) => origin.length > 0),
  );

const loadConfiguration = Effect.gen(function* () {
  const environment = yield* Config.string("ENV").pipe(
    Config.withDefault("local"),
  );
  const serviceName = yield* Config.string("SERVICE_NAME").pipe(
    Config.withDefault("gateway"),
  );
  const redisPassword = Redacted.value(
    yield* Config.redacted("REDIS_PASSWORD"),
  );

  return {
    environment,
    port: yield* Config.port("PORT"),
    serviceName,
    serviceNamespace: yield* Config.string("SERVICE_NAMESPACE").pipe(
      Config.withDefault("local"),
    ),
    apiUrl: (yield* Config.url("API_URL")).toString().replace(/\/$/, ""),
    authUrl: (yield* Config.url("AUTH_URL")).toString().replace(/\/$/, ""),
    margonemSigningKeyUrl: (yield* Config.url("MARGONEM_SIGNING_KEY_URL").pipe(
      Config.withDefault(
        new URL("https://staticinfo.margonem.pl/.well-known/signing-key.pem"),
      ),
    )).toString(),
    margonemAccountProofRequired: yield* Config.boolean(
      "MARGONEM_ACCOUNT_PROOF_REQUIRED",
    ).pipe(Config.withDefault(false)),
    rabbitmqUri: Redacted.value(yield* Config.redacted("RABBITMQ_URI")),
    activityEventSignatureSecret: Redacted.value(
      yield* Config.redacted("ACTIVITY_EVENT_SIGNATURE_SECRET"),
    ),
    redis: {
      host: yield* Config.string("REDIS_HOST"),
      port: yield* Config.port("REDIS_PORT"),
      username: yield* Config.string("REDIS_USERNAME"),
      password: redisPassword,
      keyPrefix: `${serviceName}:${environment}`,
    },
    websocketPath: yield* Config.string("WEBSOCKET_PATH").pipe(
      Config.withDefault("/ws"),
    ),
    allowedWebOrigins: splitOrigins(
      yield* Config.string("ALLOWED_WEB_ORIGINS").pipe(
        Config.withDefault("http://localhost:3000"),
      ),
    ),
    maxBackpressureBytes: yield* Config.number(
      "WEBSOCKET_MAX_BACKPRESSURE_BYTES",
    ).pipe(Config.withDefault(1_048_576)),
    maxBackpressureStrikes: yield* Config.number(
      "WEBSOCKET_MAX_BACKPRESSURE_STRIKES",
    ).pipe(Config.withDefault(3)),
  } satisfies GatewayConfiguration;
});

export class GatewayConfig extends Context.Service<
  GatewayConfig,
  GatewayConfiguration
>()("@lootlog/gateway/Config") {
  static readonly layer = Layer.effect(GatewayConfig, loadConfiguration);
}
