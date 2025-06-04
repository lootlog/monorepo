import type { Options } from "amqplib";
import { parse as parseUrl } from "url";
import { parse as parseQuery } from "querystring";

export function parseAmqpConnectionString(uri: string, extraOptions = {}) {
  const parsedUrl = parseUrl(uri);
  const query = parseQuery(parsedUrl.query || "");

  const options: Options.Connect = {
    protocol: parsedUrl.protocol?.replace(":", "") || "amqp",
    hostname: parsedUrl.hostname || "localhost",
    port: parsedUrl.port ? parseInt(parsedUrl.port) : 5672,
    username: decodeURIComponent(parsedUrl.auth?.split(":")[0] || "guest"),
    password: decodeURIComponent(parsedUrl.auth?.split(":")[1] || "guest"),
    vhost: decodeURIComponent(parsedUrl.pathname?.slice(1) || "/"),
  };

  if (query.heartbeat) {
    const heartbeat = Array.isArray(query.heartbeat)
      ? query.heartbeat[0]
      : query.heartbeat;
    options.heartbeat = parseInt(heartbeat);
  }
  if (query.locale) {
    options.locale = Array.isArray(query.locale)
      ? query.locale[0]
      : query.locale;
  }

  return {
    ...options,
    ...extraOptions,
  };
}
