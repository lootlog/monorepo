import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { App } from "supertest/types";
import { AppModule } from "./../src/app.module";
import { PrismaService } from "./../src/shared/db/prisma.service";

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it("initializes with a reachable Prisma 8 database", async () => {
    const prisma = app.get(PrismaService);

    await expect(prisma.ping()).resolves.toBeUndefined();
  });
});
