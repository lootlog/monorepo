export interface AdminConfig {
  readonly authUrl: string;
  readonly adminApiSecret: string;
  readonly apiUrl: string;
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
    authUrl: required(environment, "AUTH_INTERNAL_URL"),
    adminApiSecret: required(environment, "ADMIN_API_SECRET"),
    apiUrl: new URL(required(environment, "LOOTLOG_API_URL")).href,
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
