import { createServer } from "node:http";
import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const clientDir = join(__dirname, "dist", "client");
const serverEntry = await import("./dist/server/server.js");

const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function getMimeType(path) {
  const ext = path.slice(path.lastIndexOf("."));
  return mimeTypes[ext] ?? "application/octet-stream";
}

function nodeReqToWebRequest(req) {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value)
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }

  const method = req.method ?? "GET";
  const init = { method, headers };

  if (method !== "GET" && method !== "HEAD") {
    init.body = Readable.toWeb(req);
    init.duplex = "half";
  }

  return new Request(url, init);
}

async function sendWebResponse(res, webRes) {
  res.writeHead(webRes.status, Object.fromEntries(webRes.headers.entries()));

  if (!webRes.body) {
    res.end();
    return;
  }

  const reader = webRes.body.getReader();
  try {
    while (true) {
      // oxlint-disable-next-line no-await-in-loop -- sequential stream reading is intentional
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } finally {
    res.end();
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (url.pathname.startsWith("/assets/")) {
    const filePath = join(clientDir, url.pathname);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath);
      res.writeHead(200, {
        "Content-Type": getMimeType(url.pathname),
        "Cache-Control": "public, max-age=31536000, immutable",
      });
      res.end(content);
      return;
    }
  }

  const webReq = nodeReqToWebRequest(req);
  const webRes = await serverEntry.default.fetch(webReq);
  await sendWebResponse(res, webRes);
});

server.listen(PORT, () => {
  console.warn(`Developer portal running on http://localhost:${PORT}`);
});
