import { describe, expect, it } from "bun:test";
import { createRequestHandler } from "../src/http/router.js";

const handler = createRequestHandler({
  battles: {} as never,
  publicBattles: {} as never,
  internal: {} as never,
});

describe("Battlelog HTTP boundary", () => {
  it("returns the readiness response without initializing external resources", async () => {
    const response = await handler(
      new Request("http://battlelog.test/healthz"),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
  });

  it("rejects authenticated routes without first-party forward-auth headers", async () => {
    const response = await handler(
      new Request("http://battlelog.test/battles/@me"),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ statusCode: 401 });
  });
});
