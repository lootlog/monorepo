import { describe, expect, it } from "vitest";
import { createHealthzRoutes } from "./healthz.routes.js";

describe("createHealthzRoutes", () => {
  it("returns OK", async () => {
    const app = createHealthzRoutes();

    const response = await app.request("http://localhost/");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
  });
});
