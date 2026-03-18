import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { createTestLootPayload, TEST_USERS } from "./test-helpers";
import { createTestingModuleWithMocks } from "./test-module-helpers";

describe("Loot Diagnostic", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await createTestingModuleWithMocks({
      imports: [AppModule],
    });

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });

  it("should show validation errors", async () => {
    const lootPayload = createTestLootPayload();

    console.log("Sending payload:", JSON.stringify(lootPayload, null, 2));

    const response = await request(app.getHttpServer())
      .post("/loots")
      .set("x-auth-discord-id", TEST_USERS.MEMBER_WITH_WRITE.discordId)
      .set("x-auth-user-id", TEST_USERS.MEMBER_WITH_WRITE.id)
      .send(lootPayload);

    console.log("Response status:", response.status);
    console.log("Response body:", JSON.stringify(response.body, null, 2));

    expect(true).toBe(true);
  });
});
