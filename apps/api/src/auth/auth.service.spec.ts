import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import { AuthService } from "./auth.service";
import { HttpService } from "@nestjs/axios";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { RedisService } from "@lootlog/nest-shared";

vi.mock("src/config/auth.config", () => ({
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
          provide: WINSTON_MODULE_PROVIDER,
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
