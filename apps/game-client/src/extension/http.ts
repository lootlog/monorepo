import { isRecord } from "@lootlog/schema/records";
import { z } from "zod";
import { API_URL, AUTH_API_URL, BATTLELOG_API_URL } from "@/config/api";

const requestSchema = z.strictObject({
  url: z.string().max(8192),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  headers: z.record(z.string(), z.string().max(1024)),
  body: z.string().optional(),
});

export type ExtensionHttpRequest = z.infer<typeof requestSchema>;
export type ExtensionHttpResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
};

// Battle submissions include the complete fight event sequence.
export const MAX_EXTENSION_HTTP_BYTES = 16 * 1024 * 1024;
const encoder = new TextEncoder();
const mainRoutes: ReadonlyArray<readonly [string, RegExp]> = [
  ["GET PATCH", /^\/users\/@me\/preferences$/],
  ["GET", /^\/users\/@me\/guilds\/accessible$/],
  ["GET PATCH", /^\/users\/@me\/game-preferences\/accounts\/[^/]+$/],
  ["GET PUT", /^\/users\/@me\/lootlog-config\/accounts\/[^/]+$/],
  ["POST", /^\/users\/@me\/lootlog-config\/players\/catching-guilds\/batch$/],
  [
    "GET",
    /^\/guilds\/[^/]+\/(members(?:\/(?:@me|summary))?|worlds|permissions|roles)$/,
  ],
  ["GET", /^\/timers(?:\/history)?$/],
  ["POST", /^\/timers\/auto$/],
  ["GET", /^\/guilds\/[^/]+\/timers\/npcs\/search$/],
  ["PATCH", /^\/guilds\/[^/]+\/timers\/[^/]+\/reset$/],
  ["DELETE", /^\/guilds\/[^/]+\/timers\/[^/]+$/],
  ["GET", /^\/guilds\/[^/]+\/timers\/[^/]+\/history$/],
  ["POST", /^\/guilds\/[^/]+\/timers\/history\/[^/]+\/restore$/],
  ["POST", /^\/guilds\/[^/]+\/timers\/manual$/],
  ["GET PATCH", /^\/(timer-settings|sound-settings|preferences)$/],
  ["POST", /^\/timer-settings\/migrate$/],
  ["GET POST DELETE", /^\/guilds\/[^/]+\/chat-messages$/],
  ["DELETE PATCH", /^\/guilds\/[^/]+\/chat-messages\/[^/]+$/],
  ["POST", /^\/messaging$/],
  ["POST", /^\/messaging\/[^/]+\/volunteer$/],
  ["GET POST", /^\/messaging\/party-gathering$/],
  ["GET", /^\/messaging\/party-gathering\/[^/]+$/],
  [
    "POST",
    /^\/messaging\/party-gathering\/[^/]+\/(applications|invitations\/targets|party-observation|cancel)$/,
  ],
  [
    "DELETE",
    /^\/messaging\/party-gathering\/[^/]+\/(applications\/me|participants)$/,
  ],
  ["POST", /^\/(loots|kills)$/],
  ["PATCH", /^\/loots\/\d+$/],
];

function relativePath(url: URL, base: string): string | null {
  const parsed = new URL(base);
  const prefix = parsed.pathname.replace(/\/$/, "");
  return url.origin === parsed.origin && url.pathname.startsWith(`${prefix}/`)
    ? url.pathname.slice(prefix.length)
    : null;
}

async function readBody(response: Response): Promise<string> {
  if (
    Number(response.headers.get("content-length")) > MAX_EXTENSION_HTTP_BYTES
  ) {
    await response.body?.cancel();
    throw new Error("Extension HTTP response is too large");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let bytes = 0;
  try {
    while (true) {
      // Stream consumption must be sequential to bound retained bytes.
      // eslint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_EXTENSION_HTTP_BYTES) {
        // eslint-disable-next-line no-await-in-loop
        await reader.cancel();
        throw new Error("Extension HTTP response is too large");
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return chunks.join("");
  } finally {
    reader.releaseLock();
  }
}

function validateOperation(url: URL, request: ExtensionHttpRequest): boolean {
  const path = relativePath(url, API_URL);
  const isSession =
    relativePath(url, AUTH_API_URL) === "/idp/get-session" &&
    request.method === "GET";
  const isAllowed =
    isSession ||
    (relativePath(url, BATTLELOG_API_URL) === "/battles" &&
      request.method === "POST") ||
    (path !== null &&
      mainRoutes.some(
        ([methods, pattern]) =>
          methods.split(" ").includes(request.method) && pattern.test(path),
      ));
  if (
    !isAllowed ||
    url.username ||
    url.password ||
    url.hash ||
    /%(?:2f|5c|25|00)/i.test(url.pathname)
  ) {
    throw new Error("Extension HTTP operation is not allowed");
  }
  return isSession;
}

export async function executeExtensionHttp(
  input: unknown,
  signal: AbortSignal,
  fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
): Promise<ExtensionHttpResponse> {
  const request = requestSchema.parse(input);
  const url = new URL(request.url);
  const isSession = validateOperation(url, request);
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (!["accept", "content-type"].includes(name.toLowerCase())) {
      throw new Error("Extension HTTP header is not allowed");
    }
    headers.set(name, value);
  }
  if (
    request.body !== undefined &&
    (request.method === "GET" ||
      encoder.encode(request.body).byteLength > MAX_EXTENSION_HTTP_BYTES)
  )
    throw new Error("Extension HTTP request body is invalid or too large");
  signal.throwIfAborted();
  const response = await fetchImplementation(url.href, {
    method: request.method,
    headers,
    body: request.body,
    signal,
    credentials: "include",
    redirect: "error",
  });
  let body = await readBody(response);
  if (isSession && response.ok && body) {
    const data: unknown = JSON.parse(body);
    if (isRecord(data) && isRecord(data.session)) {
      delete data.session.token;
    }
    body = JSON.stringify(data);
  }
  const responseHeaders: Record<string, string> = {};
  for (const name of ["content-type", "retry-after"]) {
    const value = response.headers.get(name);
    if (value !== null) responseHeaders[name] = value;
  }
  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body,
  };
}
