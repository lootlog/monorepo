import { join } from "node:path";

const clientDirectory = join(import.meta.dir, "dist", "client");

const { default: app } = await import("./dist/server/server.js");

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const textHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "text/plain; charset=utf-8",
};

Bun.serve({
  port,
  async fetch(request) {
    const { pathname } = new URL(request.url);

    if (pathname === "/healthz") {
      return new Response("OK\n", { headers: textHeaders });
    }

    if (pathname.startsWith("/assets/")) {
      const asset = Bun.file(join(clientDirectory, pathname));

      if (await asset.exists()) {
        return new Response(asset, {
          headers: { "Cache-Control": "public, max-age=31536000, immutable" },
        });
      }
    }

    return app.fetch(request);
  },
  error(error) {
    console.warn("Developer portal request failed", error);

    return new Response("Internal Server Error\n", {
      status: 500,
      headers: textHeaders,
    });
  },
});

console.warn(`Developer portal running on http://localhost:${port}`);
