import { Permission } from "@lootlog/types";
import { GuildPermissions } from "./guild-permissions.js";

describe("GuildPermissions", () => {
  const cacheStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };

  const logger = {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const guildPermissions = new GuildPermissions(
    cacheStore as never,
    logger as never,
  );

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns a cached guild id when available", async () => {
    cacheStore.get.mockResolvedValue("guild-1");

    await expect(guildPermissions.resolveGuildId("guild-one")).resolves.toBe(
      "guild-1",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("resolves vanity URL to canonical guild id and caches it", async () => {
    cacheStore.get.mockResolvedValue(undefined);
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "guild-1" }), { status: 200 }),
    );

    await expect(guildPermissions.resolveGuildId("guild-one")).resolves.toBe(
      "guild-1",
    );
    expect(cacheStore.set).toHaveBeenCalledWith(
      "guild-id:guild-one",
      "guild-1",
      5 * 60 * 1000,
    );
  });

  it("returns null when guild resolution returns 404", async () => {
    cacheStore.get.mockResolvedValue(undefined);
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 404 }));

    await expect(
      guildPermissions.resolveGuildId("missing-guild"),
    ).resolves.toBeNull();
  });

  it("returns unique permissions for a resolved guild", async () => {
    cacheStore.get.mockResolvedValue(undefined);
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify([
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
        ]),
        { status: 200 },
      ),
    );

    await expect(
      guildPermissions.getUserGuildPermissions(
        "discord-2",
        "user-2",
        "guild-1",
      ),
    ).resolves.toEqual([Permission.ADMIN, Permission.LOOTLOG_ACCESS]);
  });
});
