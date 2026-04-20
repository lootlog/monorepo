import { healthzRoutes } from "../src/healthz/healthz.routes.js";

describe("Battlelog service (e2e)", () => {
  it("returns OK on /healthz", async () => {
    const response = await healthzRoutes.request("http://localhost/");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
  });
});
