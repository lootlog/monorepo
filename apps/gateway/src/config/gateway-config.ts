import {
  baseServiceConfig,
  type BaseServiceConfiguration,
  redisUrlConfig,
} from "@lootlog/instrumentation/service-config";
import {
  type CallerTokens,
  type RpcUpstream,
  rpcCallerTokensConfig,
  rpcUpstreamConfig,
} from "@lootlog/rpc/callers";
import { GatewayRpcGroup } from "@lootlog/rpc/gateway";
import { rpcPortConfig } from "@lootlog/rpc/server";
import { Config, Context, Effect, Layer, Redacted, Schema } from "effect";

import {
  ChromeExtensionOrigin,
  FirefoxExtensionOrigin,
} from "@lootlog/schema/browser-extension";

export interface GatewayConfiguration extends BaseServiceConfiguration {
  readonly rpc: {
    readonly port: number;
    readonly callerTokens: CallerTokens;
    readonly api: RpcUpstream;
    readonly auth: RpcUpstream;
  };
  readonly margonemSigningKeyUrl: string;
  readonly rabbitmqUri: Redacted.Redacted<string>;
  readonly activityEventSignatureSecret: Redacted.Redacted<string>;
  readonly redis: {
    readonly url: Redacted.Redacted<string>;
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
  const base = yield* baseServiceConfig("gateway");

  return {
    ...base,
    rpc: {
      port: yield* rpcPortConfig,
      callerTokens: yield* rpcCallerTokensConfig("gateway", GatewayRpcGroup),
      api: yield* rpcUpstreamConfig("gateway", "api"),
      auth: yield* rpcUpstreamConfig("gateway", "auth"),
    },
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
      url: yield* redisUrlConfig,
      keyPrefix: `${base.serviceName}:${base.environment}`,
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
