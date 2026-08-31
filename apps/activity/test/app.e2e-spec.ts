import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, Module } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types";
import { ActivitiesModule } from "./../src/activities/activities.module.js";
import { AppModule } from "./../src/app.module.js";

@Module({})
class TestActivitiesModule {}

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(ActivitiesModule)
      .useModule(TestActivitiesModule)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it("starts the HTTP application", async () => {
    await request(app.getHttpServer()).get("/").expect(404);
  });
});
