import { hasServiceAuthorization } from "@lootlog/protocol/http/service-auth";
import { runtimeEnvironmentConfig } from "@lootlog/instrumentation/service-config";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Config, Context, Effect, Layer, Redacted } from "effect";
import { Headers } from "effect/http";
import { RpcMiddleware } from "effect/rpc";
import { RpcCallerRejectedError } from "./errors.js";

export const RPC_PATH = "/rpc";

export type RpcService =
  | "activity"
  | "admin"
  | "api"
  | "auth"
  | "catalog"
  | "discord-bot"
  | "gateway";

export class RpcCallers extends Context.Service<
  RpcCallers,
  ReadonlyArray<RpcService>
>()("@lootlog/rpc/RpcCallers") {}

export class CallerAuth extends RpcMiddleware.Service<CallerAuth>()(
  "@lootlog/rpc/CallerAuth",
  { error: RpcCallerRejectedError, requiredForClient: true },
) {}

export type CallerTokens = Partial<
  Record<RpcService, Redacted.Redacted<string>>
>;

const LOCAL_RPC_TOKEN = Redacted.make("local-development-rpc-token");

const envSegment = (service: RpcService) =>
  service.toUpperCase().replaceAll("-", "_");

export const rpcTokenConfig = (
  caller: RpcService,
  callee: RpcService,
): Config.Config<Redacted.Redacted<string>> => {
  const token = Config.Redacted(
    `RPC_TOKEN_${envSegment(caller)}_TO_${envSegment(callee)}`,
  );

  return runtimeEnvironmentConfig.pipe(
    Config.flatMap((environment) =>
      environment === RuntimeEnvironment.LOCAL
        ? token.pipe(Config.withDefault(LOCAL_RPC_TOKEN))
        : token,
    ),
  );
};

interface AnnotatedRpc {
  readonly annotations: Context.Context<never>;
}

const allowedCallers = (rpc: AnnotatedRpc): ReadonlyArray<RpcService> =>
  Context.getOrElse(rpc.annotations, RpcCallers, () => []);

export const rpcCallerTokensConfig = (
  callee: RpcService,
  group: { readonly requests: ReadonlyMap<string, AnnotatedRpc> },
): Config.Config<CallerTokens> => {
  const callers = new Set([...group.requests.values()].flatMap(allowedCallers));

  return Config.all(
    Object.fromEntries(
      [...callers].map((caller) => [caller, rpcTokenConfig(caller, callee)]),
    ),
  );
};

export const callerAuthServer = (tokens: CallerTokens) =>
  Layer.succeed(
    CallerAuth,
    CallerAuth.of((effect, { rpc, headers }) =>
      allowedCallers(rpc).some((caller) =>
        hasServiceAuthorization(headers.authorization, tokens[caller]),
      )
        ? effect
        : Effect.fail(new RpcCallerRejectedError()),
    ),
  );

export const callerAuthClient = (token: Redacted.Redacted<string>) =>
  RpcMiddleware.layerClient(CallerAuth, ({ request, next }) =>
    next({
      ...request,
      headers: Headers.set(
        request.headers,
        "authorization",
        `Bearer ${Redacted.value(token)}`,
      ),
    }),
  );

export interface RpcUpstream {
  readonly url: string;
  readonly token: Redacted.Redacted<string>;
}

export const rpcUpstreamConfig = (
  caller: RpcService,
  callee: RpcService,
): Config.Config<RpcUpstream> =>
  Config.all({
    url: Config.URL(`${envSegment(callee)}_RPC_URL`).pipe(Config.map(String)),
    token: rpcTokenConfig(caller, callee),
  });
