import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import { createDeveloperServer } from "./server-handler.js";

test("GET /healthz responds without invoking the application", async (context) => {
  let applicationInvoked = false;
  const server = createDeveloperServer({
    clientDirectory: new URL("./does-not-exist", import.meta.url).pathname,
    port: 0,
    serverEntry: {
      default: {
        fetch() {
          applicationInvoked = true;
          return new Response("application");
        },
      },
    },
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());

  const address = server.address();
  assert(address && typeof address === "object");

  const response = await fetch(`http://127.0.0.1:${address.port}/healthz`);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "OK\n");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(applicationInvoked, false);
});
