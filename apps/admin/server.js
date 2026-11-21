import { join, normalize } from "node:path";

const clientDirectory = join(import.meta.dir, "dist", "client");

const { default: app } = await import("./dist/server/server.js");

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const textHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "text/plain; charset=utf-8",
};

const STATIC_ASSET = /\.(?:js|css|woff2?|svg|png|ico)$/u;

Bun.serve({
  port,
  async fetch(request) {
    const { pathname } = new URL(request.url);

    if (pathname === "/healthz") {
      return new Response("OK\n", { headers: textHeaders });
    }

    if (pathname.startsWith("/assets/") && STATIC_ASSET.test(pathname)) {
      const path = normalize(join(clientDirectory, pathname));
      const asset = Bun.file(path);

      if (path.startsWith(clientDirectory) && (await asset.exists())) {
        return new Response(asset, {
          headers: {
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }

    return app.fetch(request);
  },
  error(error) {
    console.warn("Admin panel request failed", error);

    return new Response("Internal Server Error\n", {
      status: 500,
      headers: textHeaders,
    });
  },
});

console.warn(`Admin panel running on http://localhost:${port}`);
