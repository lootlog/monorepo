import { Test, type TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { of, throwError } from "rxjs";
import { Permission } from "@lootlog/types";
import { ConfigKey } from "src/config/config-key.enum";
import { PermissionsService } from "./permissions.service";

describe("PermissionsService", () => {
  let service: PermissionsService;

  const mockHttpService = {
    get: vi.fn(),
  };

  const mockConfigService = {
    get: vi.fn().mockImplementation((key: string) => {
      if (key === ConfigKey.API_SERVICE) {
        return { url: "http://api-service:3000" };
      }

      return undefined;
    }),
  };

  const mockCacheManager = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("resolveGuildId", () => {
    it("should return a cached guild id when available", async () => {
      mockCacheManager.get.mockResolvedValue("guild-1");

      await expect(service.resolveGuildId("guild-one")).resolves.toBe(
        "guild-1",
      );
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it("should resolve vanity URL to canonical guild id and cache it", async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            id: "guild-1",
          },
        }),
      );

      await expect(service.resolveGuildId("guild-one")).resolves.toBe(
        "guild-1",
      );
      expect(mockHttpService.get).toHaveBeenCalledWith(
        "http://api-service:3000/internal/guilds/guild-one",
      );
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        "guild-id:guild-one",
        "guild-1",
        60000 * 5,
      );
    });

    it("should return null when guild resolution returns 404", async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      mockHttpService.get.mockReturnValue(
        throwError(() => ({
          response: {
            status: 404,
          },
        })),
      );

      await expect(service.resolveGuildId("missing-guild")).resolves.toBeNull();
    });
  });

  describe("getUserPermissions", () => {
    it("should normalize a falsy API response to an empty array before caching", async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      mockHttpService.get.mockReturnValue(of({ data: undefined }));

      await expect(
        service.getUserPermissions("discord-1", "user-1"),
      ).resolves.toEqual([]);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        "permissions:user-1:discord-1",
        [],
        60000 * 5,
      );
    });

    it("should return unique permissions for a resolved guild", async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      mockHttpService.get.mockReturnValue(
        of({
          data: [
            {
              guild: {
                id: "guild-1",
                ownerId: "owner-1",
              },
              roles: [
                {
                  id: "role-1",
                  lvlRangeFrom: 0,
                  lvlRangeTo: 100,
                  permissions: [Permission.ADMIN, Permission.LOOTLOG_ACCESS],
                },
                {
                  id: "role-2",
                  lvlRangeFrom: 0,
                  lvlRangeTo: 100,
                  permissions: [Permission.ADMIN],
                },
              ],
            },
          ],
        }),
      );

      await expect(
        service.getUserGuildPermissions("discord-2", "user-2", "guild-1"),
      ).resolves.toEqual([Permission.ADMIN, Permission.LOOTLOG_ACCESS]);
    });
  });
});
