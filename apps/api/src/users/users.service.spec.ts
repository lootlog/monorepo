import { Test, type TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { AuthService } from "src/auth/auth.service";
import { UsersService } from "./users.service";
import { PrismaService } from "src/db/prisma.service";

describe("UserService", () => {
  let service: UsersService;

  const mockPrismaService = {
    userSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };
  const mockLogger = { warn: jest.fn() };
  const mockAuthService = { invalidateIdpTokenCache: jest.fn() };
  const mockHttpService = { post: jest.fn() };
  const mockConfigService = {
    get: jest
      .fn()
      .mockReturnValue({ serviceUrl: "http://battlelog-service:4000" }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
