import { healthzController } from "./healthz.controller.js";

describe("HealthzController", () => {
  describe("healthCheck", () => {
    it("should return OK", async () => {
      const response = await healthzController.request("http://localhost/");

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });
  });
});
