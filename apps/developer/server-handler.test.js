import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createDeveloperServer } from "./server-handler.js";

async function startServer(context, serverEntry, clientDirectory) {
  const server = createDeveloperServer({
    clientDirectory:
      clientDirectory ?? new URL("./does-not-exist", import.meta.url).pathname,
    port: 0,
    serverEntry,
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());

  const address = server.address();
  assert(address && typeof address === "object");

  return `http://127.0.0.1:${address.port}`;
}

test("GET /healthz responds without invoking the application", async (context) => {
  let applicationInvoked = false;
  const origin = await startServer(context, {
    default: {
      fetch() {
        applicationInvoked = true;
        return new Response("application");
      },
    },
  });

  const response = await fetch(`${origin}/healthz`);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "OK\n");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(applicationInvoked, false);
});

test("application responses preserve multiple Set-Cookie headers", async (context) => {
  const origin = await startServer(context, {
    default: {
      fetch() {
        const headers = new Headers();
        headers.append("Set-Cookie", "session=abc; Path=/; HttpOnly");
        headers.append("Set-Cookie", "csrf=def; Path=/");
        return new Response("application", { headers });
      },
    },
  });

  const response = await fetch(origin);

  assert.equal(response.status, 200);
  assert.deepEqual(response.headers.getSetCookie(), [
    "session=abc; Path=/; HttpOnly",
    "csrf=def; Path=/",
  ]);
  assert.equal(await response.text(), "application");
});

test("application errors return 500 without terminating the server", async (context) => {
  const origin = await startServer(context, {
    default: {
      fetch() {
        throw new Error("application failure");
      },
    },
  });

  const errorResponse = await fetch(origin);
  assert.equal(errorResponse.status, 500);
  assert.equal(await errorResponse.text(), "Internal Server Error\n");

  const healthResponse = await fetch(`${origin}/healthz`);
  assert.equal(healthResponse.status, 200);
});

test("assets are served from the client directory", async (context) => {
  const clientDirectory = await mkdtemp(join(tmpdir(), "developer-server-"));
  context.after(() => rm(clientDirectory, { force: true, recursive: true }));
  const assetsDirectory = join(clientDirectory, "assets");
  await mkdir(assetsDirectory, { recursive: true });
  await writeFile(join(assetsDirectory, "application.js"), "asset");

  let applicationInvoked = false;
  const origin = await startServer(
    context,
    {
      default: {
        fetch() {
          applicationInvoked = true;
          return new Response("application");
        },
      },
    },
    clientDirectory,
  );

  const response = await fetch(`${origin}/assets/application.js`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/javascript");
  assert.equal(await response.text(), "asset");
  assert.equal(applicationInvoked, false);
});
