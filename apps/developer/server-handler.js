import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const mimeTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function getMimeType(path) {
  return mimeTypes[extname(path)] ?? "application/octet-stream";
}

function nodeRequestToWebRequest(request, port) {
  const url = new URL(request.url ?? "/", `http://localhost:${port}`);
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (value) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
  }

  const method = request.method ?? "GET";
  const requestInit = { headers, method };

  if (method !== "GET" && method !== "HEAD") {
    requestInit.body = Readable.toWeb(request);
    requestInit.duplex = "half";
  }

  return new Request(url, requestInit);
}

async function sendWebResponse(response, webResponse) {
  const headers = {};
  for (const [name, value] of webResponse.headers.entries()) {
    if (name !== "set-cookie") {
      headers[name] = value;
    }
  }

  const setCookies = webResponse.headers.getSetCookie();
  if (setCookies.length > 0) {
    headers["set-cookie"] = setCookies;
  }

  response.writeHead(webResponse.status, headers);

  if (!webResponse.body) {
    response.end();
    return;
  }

  await pipeline(Readable.fromWeb(webResponse.body), response);
}

export function createDeveloperServer({ clientDirectory, port, serverEntry }) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://localhost:${port}`);

      if (url.pathname === "/healthz") {
        response.writeHead(200, {
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8",
        });
        response.end("OK\n");
        return;
      }

      if (url.pathname.startsWith("/assets/")) {
        const filePath = join(clientDirectory, url.pathname);
        try {
          const file = await readFile(filePath);
          response.writeHead(200, {
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Type": getMimeType(url.pathname),
          });
          response.end(file);
          return;
        } catch (error) {
          if (
            !(error instanceof Error && "code" in error) ||
            (error.code !== "ENOENT" && error.code !== "ENOTDIR")
          ) {
            throw error;
          }
        }
      }

      const webRequest = nodeRequestToWebRequest(request, port);
      const webResponse = await serverEntry.default.fetch(webRequest);
      await sendWebResponse(response, webResponse);
    } catch (error) {
      const requestError =
        error instanceof Error ? error : new Error(String(error));
      console.warn("Developer portal request failed", requestError);

      if (response.headersSent) {
        if (!response.destroyed) {
          response.destroy(requestError);
        }
        return;
      }

      response.writeHead(500, {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end("Internal Server Error\n");
    }
  });
}
