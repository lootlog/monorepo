/** What the panel needs to know to reach the auth service and its operator. */
export interface AdminConfig {
  /** The auth service on the private network. */
  readonly authUrl: string;
  readonly adminApiSecret: string;
  /** The Lootlog API behind the edge, which authorizes the operator's session. */
  readonly apiUrl: string;
  /** The origin the browser sees, which state-changing requests must name. */
  readonly origin: string;
  /** The Web app, where the operator signs in to Lootlog. */
  readonly webUrl: string;
  /** The Cloudflare Access application in front of the tunnel. */
  readonly access:
    | { readonly teamDomain: string; readonly audience: string }
    | undefined;
  readonly operatorEmails: ReadonlySet<string>;
  /** Stands in for a verified operator; a production build never sets it. */
  readonly devOperator: string | undefined;
}

type Environment = Readonly<Record<string, string | undefined>>;

const required = (environment: Environment, name: string) => {
  const value = environment[name]?.trim();

  if (!value) throw new Error(`${name} must be configured.`);

  return value;
};

/**
 * Reads the configuration and refuses to start half-configured: a production
 * build without an Access application and an operator would serve everyone
 * who reaches the port.
 */
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
