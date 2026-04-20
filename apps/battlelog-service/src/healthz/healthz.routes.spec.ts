import { healthzRoutes } from "./healthz.routes.js";

describe("healthzRoutes", () => {
  describe("healthCheck", () => {
    it("should return OK", async () => {
      const response = await healthzRoutes.request("http://localhost/");

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("OK");
    });
  });
});
