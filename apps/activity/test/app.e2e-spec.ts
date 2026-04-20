import { createApp } from "../src/app.js";

describe("activity app", () => {
  it("serves the generated OpenAPI document", async () => {
    const app = createApp({
      activityQuery: {} as never,
      activityStore: {} as never,
      permissionsService: {} as never,
      prismaDatabase: {
        ping: vi.fn(),
      } as never,
    });

    const response = await app.request("/doc");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      info: {
        title: "Activity Logger API",
      },
    });
  });
});
