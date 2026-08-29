import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "./../src/app.module.js";
import { createTestingModuleWithMocks } from "./test-module-helpers.js";

describe("HealthzController (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await createTestingModuleWithMocks({
      imports: [AppModule],
    });

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });

  it("/healthz (GET)", () => {
    return request(app.getHttpServer()).get("/healthz").expect(200);
  });
});
