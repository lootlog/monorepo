import { Test, type TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { RedisService } from "@lootlog/nest-shared";

describe("AuthService", () => {
  let service: AuthService;

  const mockLogger = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };

  const mockHttpService = {
    post: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn().mockReturnValue({
      serviceUrl: "http://localhost:3001",
    }),
  };

  const mockRedisService = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
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
          provide: ConfigService,
          useValue: mockConfigService,
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
