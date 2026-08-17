import { check } from "k6";
import http from "k6/http";

export function apiRequest(
  config,
  service,
  endpoint,
  method,
  path,
  options = {},
) {
  const url = buildUrl(config.baseUrls[service], path, options.query);
  const body = buildBody(options.body);
  const params = buildRequestParams(config, service, endpoint, options);
  const response = http.request(method, url, body, params);
  const expectedStatuses = options.expectedStatuses ?? [200];
  const acceptedStatuses = options.optional
    ? Array.from(new Set([...expectedStatuses, 204, 403, 404]))
    : expectedStatuses;

  check(
    response,
    {
      [`${service}.${endpoint} status`]: (res) =>
        acceptedStatuses.includes(res.status),
    },
    {
      endpoint,
      optional: options.optional ? "true" : "false",
      service,
    },
  );

  return response;
}

export function rawGet(config, service, path, query) {
  return http.get(buildUrl(config.baseUrls[service], path, query), {
    ...buildRequestParams(config, service, "fixture-discovery", {
      expectedStatuses: [200],
    }),
    responseType: "text",
  });
}

export function jsonBody(response, fallback = null) {
  try {
    return response.json();
  } catch {
    return fallback;
  }
}

export function firstCollectionItem(value) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  if (typeof value !== "object") {
    return null;
  }

  for (const key of [
    "data",
    "items",
    "results",
    "rows",
    "battles",
    "activityLogs",
    "logs",
    "documents",
    "events",
    "loots",
    "guilds",
  ]) {
    const item = firstCollectionItem(value[key]);
    if (item) {
      return item;
    }
  }

  return null;
}

export function readId(value) {
  if (!value || typeof value !== "object") {
    return "";
  }

  for (const key of ["id", "battleId", "lootId", "eventId", "docId"]) {
    if (typeof value[key] === "string" && value[key]) {
      return value[key];
    }
  }

  if (typeof value.id === "number") {
    return String(value.id);
  }

  return "";
}

export function buildRequestParams(config, service, endpoint, options = {}) {
  const headers = {
    Accept: "application/json",
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (config.auth.token) {
    headers.Authorization = config.auth.token.match(/^Bearer\s+/i)
      ? config.auth.token
      : `Bearer ${config.auth.token}`;
  }

  if (config.auth.cookie) {
    headers.Cookie = config.auth.cookie;
  }

  return {
    headers,
    tags: {
      endpoint,
      service,
      ...options.tags,
    },
    timeout: config.httpTimeout,
  };
}

function buildBody(body) {
  if (body === undefined || body === null) {
    return null;
  }

  return typeof body === "string" ? body : JSON.stringify(body);
}

function buildUrl(baseUrl, path, query) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const queryString = encodeQuery(query);

  return `${normalizedBase}${normalizedPath}${queryString}`;
}

function encodeQuery(query) {
  if (!query) {
    return "";
  }

  const parts = [];

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        parts.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`,
        );
      }
      continue;
    }

    parts.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  }

  return parts.length > 0 ? `?${parts.join("&")}` : "";
}
