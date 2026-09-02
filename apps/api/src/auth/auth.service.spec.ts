import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "#src/test/mock-fn";
import { AuthService } from "./auth.service.js";
import { APPLICATION_LOGGER } from "#src/shared/logging/logger-token";
import { RedisService } from "#src/redis/redis.service";

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

  const mockRedisService = {
    get: mockFn(),
    set: mockFn(),
    del: mockFn(),
  };

  beforeEach(async () => {
    vi.unstubAllGlobals();
    mockRedisService.get.mockResolvedValue(null);
    mockRedisService.set.mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: APPLICATION_LOGGER,
          useValue: mockLogger,
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

  it("requests the IDP token with the forwarded identities", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        accessToken: "token",
        expiresAt: "2026-09-02T12:00:00Z",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(service.getIdpToken("user-a", "discord-a")).resolves.toEqual({
      accessToken: "token",
      expiresAt: "2026-09-02T12:00:00Z",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/auth/idp-token",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userId: "user-a", discordId: "discord-a" }),
      }),
    );
  });

  it("preserves the account-not-found classification", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: "ACCOUNT_NOT_FOUND" }, { status: 400 }),
      ),
    );

    await expect(
      service.getIdpToken("user-a", "discord-a"),
    ).rejects.toMatchObject({ name: "AccountNotFoundError" });
  });
});
