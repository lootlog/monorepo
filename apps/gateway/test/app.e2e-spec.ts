import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("Gateway e2e", () => {
  it("returns OK from /healthz", async () => {
    const app = createApp();

    const response = await app.request("http://localhost/healthz");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
  });
});
