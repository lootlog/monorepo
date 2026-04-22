import { of, from, throwError } from "rxjs";
import { HttpService } from "@nestjs/axios";
import { GuildsService } from "./guilds.service";
import type { UserGuildData } from "./types/guild.types";
import { getUserGuildsCacheKey, CACHE_TTL } from "./utils/cache-keys.util";
import { Permission } from "@lootlog/types";

function createGuilds(): UserGuildData[] {
  return [
    {
      guild: {
        id: "guild-1",
        ownerId: "owner-1",
      },
      roles: [
        {
          id: "role-1",
          lvlRangeFrom: 1,
          lvlRangeTo: 500,
          permissions: [Permission.LOOTLOG_TIMERS_READ],
        },
      ],
    },
  ];
}

describe("GuildsService", () => {
  const mockHttpService = {
    get: vi.fn(),
  };

  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  };

  let service: GuildsService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-22T10:00:00.000Z"));

    service = new GuildsService(
      mockHttpService as unknown as HttpService,
      mockRedis as never,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns guilds from fresh cache without calling HTTP", async () => {
    const guilds = createGuilds();
    const cacheKey = getUserGuildsCacheKey("discord-1", "user-1");

    mockRedis.get.mockResolvedValue(
      JSON.stringify({
        guilds,
        cachedAt: Date.now(),
      }),
    );

    const result = await service.getUserGuilds({
      discordId: "discord-1",
      userId: "user-1",
    });

    expect(mockRedis.get).toHaveBeenCalledWith(cacheKey);
    expect(mockHttpService.get).not.toHaveBeenCalled();
    expect(result).toEqual(guilds);
  });

  it("retries HTTP fetch and caches guilds after a transient failure", async () => {
    const guilds = createGuilds();

    vi.spyOn(service as never, "sleep").mockResolvedValue(undefined);

    mockRedis.get.mockResolvedValue(null);
    mockHttpService.get
      .mockReturnValueOnce(throwError(() => new Error("temporary failure")))
      .mockReturnValueOnce(of({ data: guilds }));

    const result = await service.getUserGuilds({
      discordId: "discord-1",
      userId: "user-1",
    });

    expect(mockHttpService.get).toHaveBeenCalledTimes(2);
    expect(mockRedis.set).toHaveBeenCalledWith(
      getUserGuildsCacheKey("discord-1", "user-1"),
      expect.any(String),
      CACHE_TTL.USER_GUILDS * 2,
    );
    expect(result).toEqual(guilds);
  });

  it("falls back to recent stale cache when HTTP fetch fails", async () => {
    const guilds = createGuilds();
    const staleCachedAt = Date.now() - (CACHE_TTL.USER_GUILDS + 30) * 1000;

    vi.spyOn(service as never, "sleep").mockResolvedValue(undefined);

    mockRedis.get.mockResolvedValue(
      JSON.stringify({
        guilds,
        cachedAt: staleCachedAt,
      }),
    );
    mockHttpService.get.mockReturnValue(
      throwError(() => new Error("network unavailable")),
    );

    const result = await service.getUserGuilds({
      discordId: "discord-1",
      userId: "user-1",
    });

    expect(mockHttpService.get).toHaveBeenCalledTimes(4);
    expect(result).toEqual(guilds);
  });

  it("rejects stale cache older than max stale age and returns empty guilds", async () => {
    const guilds = createGuilds();
    const staleCachedAt =
      Date.now() - (CACHE_TTL.MAX_STALE_CACHE_AGE + 1) * 1000;

    vi.spyOn(service as never, "sleep").mockResolvedValue(undefined);

    mockRedis.get.mockResolvedValue(
      JSON.stringify({
        guilds,
        cachedAt: staleCachedAt,
      }),
    );
    mockHttpService.get.mockReturnValue(
      throwError(() => new Error("network unavailable")),
    );

    const result = await service.getUserGuilds({
      discordId: "discord-1",
      userId: "user-1",
    });

    expect(result).toEqual([]);
  });

  it("deduplicates concurrent requests for the same user", async () => {
    const guilds = createGuilds();
    let resolveRequest!: (value: { data: UserGuildData[] }) => void;

    mockRedis.get.mockResolvedValue(null);
    mockHttpService.get.mockReturnValue(
      from(
        new Promise<{ data: UserGuildData[] }>((resolve) => {
          resolveRequest = resolve;
        }),
      ),
    );

    const firstRequest = service.getUserGuilds({
      discordId: "discord-1",
      userId: "user-1",
    });
    const secondRequest = service.getUserGuilds({
      discordId: "discord-1",
      userId: "user-1",
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(mockHttpService.get).toHaveBeenCalledTimes(1);

    resolveRequest({ data: guilds });

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
      guilds,
      guilds,
    ]);
  });
});
