import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { Readable } from "node:stream";

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
  response.writeHead(
    webResponse.status,
    Object.fromEntries(webResponse.headers.entries()),
  );

  if (!webResponse.body) {
    response.end();
    return;
  }

  const reader = webResponse.body.getReader();
  try {
    while (true) {
      // oxlint-disable-next-line no-await-in-loop -- sequential stream reading is intentional
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      response.write(value);
    }
  } finally {
    response.end();
  }
}

export function createDeveloperServer({ clientDirectory, port, serverEntry }) {
  return createServer(async (request, response) => {
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
      if (existsSync(filePath)) {
        response.writeHead(200, {
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Type": getMimeType(url.pathname),
        });
        response.end(readFileSync(filePath));
        return;
      }
    }

    const webRequest = nodeRequestToWebRequest(request, port);
    const webResponse = await serverEntry.default.fetch(webRequest);
    await sendWebResponse(response, webResponse);
  });
}
