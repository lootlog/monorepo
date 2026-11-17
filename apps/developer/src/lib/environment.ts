import type { DeploymentEnvironment } from "@lootlog/schema/api-services";

const PORTAL_HOSTS = new Map<string, DeploymentEnvironment>([
  ["developer.lootlog.pl", "production"],
  ["dev-developer.lootlog.pl", "development"],
  ["localhost", "local"],
  ["127.0.0.1", "local"],
]);

/**
 * The environment whose services a portal host talks to. An unknown host,
 * such as a preview deployment, never reaches production.
 */
export const getPortalEnvironment = (hostname: string): DeploymentEnvironment =>
  PORTAL_HOSTS.get(hostname) ?? "development";

/** The host a portal request was sent to, as the reverse proxy forwards it. */
export const requestHostname = (request: Request) =>
  request.headers.get("host")?.split(":")[0] ?? new URL(request.url).hostname;
