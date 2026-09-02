import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "#src/test/mock-fn";
import { AuthService } from "./auth.service.js";
import { HttpService } from "@nestjs/axios";
import { APPLICATION_LOGGER } from "#src/shared/logging/logger-token";
import { RedisService } from "@lootlog/nest-shared/redis";

vi.mock("#src/config/auth.config", () => ({
  authConfig: { serviceUrl: "http://localhost:3001" },
}));

describe("AuthService", () => {
  let service: AuthService;

  const mockLogger = {
    log: mockFn(),
    error: mockFn(),
    warn: mockFn(),
  };

  const mockHttpService = {
    post: mockFn(),
  };

  const mockRedisService = {
    get: mockFn(),
    set: mockFn(),
    del: mockFn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: APPLICATION_LOGGER,
          useValue: mockLogger,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
