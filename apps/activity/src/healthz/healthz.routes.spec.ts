import { createHealthzRoutes } from "./healthz.routes.js";

describe("createHealthzRoutes", () => {
  const prismaDatabase = {
    ping: vi.fn(),
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns 200 when all probes pass", async () => {
    prismaDatabase.ping.mockResolvedValue(undefined);
    vi.mocked(fetch).mockResolvedValue(new Response("OK", { status: 200 }));

    const routes = createHealthzRoutes({
      apiServiceUrl: "http://api-service:3000",
      prismaDatabase: prismaDatabase as never,
    });

    const response = await routes.request("/");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.info.database).toEqual({ status: "up" });
  });

  it("returns 503 when a dependency probe fails", async () => {
    prismaDatabase.ping.mockResolvedValue(undefined);
    vi.mocked(fetch).mockResolvedValue(
      new Response("unhealthy", { status: 500 }),
    );

    const routes = createHealthzRoutes({
      apiServiceUrl: "http://api-service:3000",
      prismaDatabase: prismaDatabase as never,
    });

    const response = await routes.request("/");
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.error["api-service"]).toBeDefined();
  });
});
