import { type RpcUpstream, rpcUpstreamConfig } from "@lootlog/rpc/callers";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Config, ConfigProvider, Effect } from "effect";

export interface AdminConfig {
  readonly rpc: { readonly auth: RpcUpstream; readonly api: RpcUpstream };
  readonly origin: string;
  readonly webUrl: string;
  readonly access:
    | { readonly teamDomain: string; readonly audience: string }
    | undefined;
  readonly operatorEmails: ReadonlySet<string>;
  readonly devOperator: string | undefined;
}

type Environment = Readonly<Record<string, string | undefined>>;

const required = (environment: Environment, name: string) => {
  const value = environment[name]?.trim();

  if (!value) throw new Error(`${name} must be configured.`);

  return value;
};

const rpcUpstreams = Config.all({
  auth: rpcUpstreamConfig("admin", "auth"),
  api: rpcUpstreamConfig("admin", "api"),
});

const readRpcUpstreams = (environment: Environment, production: boolean) =>
  Effect.runSync(
    rpcUpstreams.parse(
      ConfigProvider.fromEnvRecord({
        ...environment,
        ENV:
          environment.ENV ??
          (production ? RuntimeEnvironment.PROD : RuntimeEnvironment.LOCAL),
      }),
    ),
  );

export const readAdminConfig = (
  environment: Environment,
  production: boolean,
): AdminConfig => {
  const teamDomain = environment.CF_ACCESS_TEAM_DOMAIN?.trim();
  const audience = environment.CF_ACCESS_AUD?.trim();

  const operatorEmails = new Set(
    (environment.ADMIN_OPERATOR_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

  const access = teamDomain && audience ? { teamDomain, audience } : undefined;

  if (production && (!access || operatorEmails.size === 0))
    throw new Error(
      "CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD and ADMIN_OPERATOR_EMAILS must be configured.",
    );

  return {
    rpc: readRpcUpstreams(environment, production),
    origin: new URL(required(environment, "ADMIN_ORIGIN")).origin,
    webUrl: new URL(required(environment, "LOOTLOG_WEB_URL")).href,
    access,
    operatorEmails,
    devOperator:
      production || access
        ? undefined
        : environment.ADMIN_DEV_OPERATOR?.trim() || "dev@localhost",
  };
};

let cached: AdminConfig | undefined;

export const adminConfig = (): AdminConfig =>
  (cached ??= readAdminConfig(process.env, import.meta.env.PROD));
