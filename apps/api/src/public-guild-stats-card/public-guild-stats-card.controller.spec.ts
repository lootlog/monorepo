import { Test, type TestingModule } from "@nestjs/testing";
import type { FastifyReply } from "fastify";
import { serviceConfig } from "src/config/service.config";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { mockFn } from "src/test/mock-fn";
import { RuntimeEnvironment } from "src/types/runtime.types";
import { PublicGuildStatsCardController } from "./public-guild-stats-card.controller";
import { PublicGuildStatsCardService } from "./public-guild-stats-card.service";

describe("PublicGuildStatsCardController", () => {
  let controller: PublicGuildStatsCardController;
  let service: { getStatsCard: ReturnType<typeof mockFn> };

  const createReply = () => {
    const reply = {
      header: mockFn(),
      send: mockFn(),
    };
    reply.header.mockReturnValue(reply);
    reply.send.mockReturnValue(reply);
    return reply as unknown as FastifyReply;
  };

  beforeEach(async () => {
    serviceConfig.env = RuntimeEnvironment.PROD;
    service = {
      getStatsCard: mockFn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicGuildStatsCardController],
      providers: [{ provide: PublicGuildStatsCardService, useValue: service }],
    }).compile();

    controller = module.get(PublicGuildStatsCardController);
  });

  afterEach(() => {
    vi.clearAllMocks();
    serviceConfig.env = RuntimeEnvironment.LOCAL;
  });

  it("does not register AuthGuard metadata on the public route", () => {
    const classGuards =
      Reflect.getMetadata("__guards__", PublicGuildStatsCardController) ?? [];
    const routeGuards =
      Reflect.getMetadata(
        "__guards__",
        PublicGuildStatsCardController.prototype.getStatsCard,
      ) ?? [];

    expect([...classGuards, ...routeGuards]).not.toContain(AuthGuard);
  });

  it("returns a png response with public cache headers", async () => {
    const image = Buffer.from("png");
    const reply = createReply();
    service.getStatsCard.mockResolvedValue(image);

    await controller.getStatsCard("guild-1", reply);

    expect(service.getStatsCard).toHaveBeenCalledWith("guild-1");
    expect(reply.header).toHaveBeenCalledWith("Content-Type", "image/png");
    expect(reply.header).toHaveBeenCalledWith(
      "Cache-Control",
      "public, max-age=300, must-revalidate",
    );
    expect(reply.send).toHaveBeenCalledWith(image);
  });

  it("disables response cache in local environment", async () => {
    serviceConfig.env = RuntimeEnvironment.LOCAL;
    const image = Buffer.from("png");
    const reply = createReply();
    service.getStatsCard.mockResolvedValue(image);

    await controller.getStatsCard("guild-1", reply);

    expect(reply.header).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(reply.send).toHaveBeenCalledWith(image);
  });
});
