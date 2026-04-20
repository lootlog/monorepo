import { healthzController } from "../src/healthz/healthz.controller.js";

describe("Battlelog service (e2e)", () => {
  it("returns OK on /healthz", async () => {
    const response = await healthzController.request("http://localhost/");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
  });
});
