import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";

type BetterAuthFastifyRequest = Pick<
  FastifyRequest,
  "body" | "headers" | "method" | "raw" | "url"
>;

const getHeaderValue = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

const isUrlEncodedRequest = (headers: BetterAuthFastifyRequest["headers"]) => {
  const contentType = getHeaderValue(headers["content-type"]);

  return (
    typeof contentType === "string" &&
    contentType.toLowerCase().startsWith("application/x-www-form-urlencoded")
  );
};

const serializeParsedBody = (
  body: unknown,
  headers: BetterAuthFastifyRequest["headers"],
): BodyInit | undefined => {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (
    typeof body === "string" ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }

  if (ArrayBuffer.isView(body)) {
    return new TextDecoder().decode(
      new Uint8Array(body.buffer, body.byteOffset, body.byteLength),
    );
  }

  if (isUrlEncodedRequest(headers) && isPlainObject(body)) {
    return new URLSearchParams(
      Object.entries(body).flatMap(([key, value]) => {
        if (value === undefined) {
          return [];
        }

        if (Array.isArray(value)) {
          return value.map((entry) => [key, `${entry}`]);
        }

        return [[key, `${value}`]];
      }),
    );
  }

  return JSON.stringify(body);
};

const readRawBody = async (
  request: BetterAuthFastifyRequest,
): Promise<BodyInit | undefined> => {
  const chunks: Buffer[] = [];

  for await (const chunk of request.raw) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return undefined;
  }

  return Buffer.concat(chunks);
};

const getRequestProtocol = (request: BetterAuthFastifyRequest) => {
  const forwardedProtocol = getHeaderValue(
    request.headers["x-forwarded-proto"],
  );

  if (typeof forwardedProtocol === "string" && forwardedProtocol.length > 0) {
    const firstForwardedProtocol = forwardedProtocol.split(",")[0]?.trim();

    if (firstForwardedProtocol) {
      return firstForwardedProtocol;
    }

    return "http";
  }

  return (request.raw.socket as { encrypted?: boolean }).encrypted
    ? "https"
    : "http";
};

export const buildBetterAuthRequest = async (
  request: BetterAuthFastifyRequest,
) => {
  const requestProtocol = getRequestProtocol(request);
  const requestHost = getHeaderValue(request.headers.host) ?? "localhost";
  const origin = `${requestProtocol}://${requestHost}`;
  const parsedBody = serializeParsedBody(request.body, request.headers);
  const body =
    parsedBody ??
    (request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await readRawBody(request));

  const requestInit = {
    method: request.method,
    headers: fromNodeHeaders(request.headers),
    body,
    duplex: body ? "half" : undefined,
  } satisfies RequestInit & { duplex?: "half" };

  return new Request(new URL(request.url, origin), requestInit);
};

export const sendBetterAuthResponse = async (
  reply: FastifyReply,
  response: Response,
) => {
  const setCookieHeaders = response.headers.getSetCookie();

  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase() === "set-cookie") {
      continue;
    }

    reply.header(key, value);
  }

  for (const cookie of setCookieHeaders) {
    reply.header("set-cookie", cookie);
  }

  reply.status(response.status);

  if (!response.body) {
    return reply.send();
  }

  return reply.send(await response.text());
};
