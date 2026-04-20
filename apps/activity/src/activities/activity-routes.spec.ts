import { Permission } from "@lootlog/types";
import { createApp } from "../app.js";
import type { ActivityQuery } from "./activity-query.js";
import type { ActivityStore } from "./activity-store.js";
import type { GuildPermissions } from "../permissions/guild-permissions.js";

describe("createActivityRoutes", () => {
  const activityQuery = {
    findByGuild: vi.fn(),
    findByUser: vi.fn(),
    findOne: vi.fn(),
    suggestActorNames: vi.fn(),
    suggestWorlds: vi.fn(),
    suggestClanNames: vi.fn(),
  } as unknown as ActivityQuery;

  const activityStore = {
    deleteOne: vi.fn(),
  } as unknown as ActivityStore;

  const guildPermissions = {
    resolveGuildId: vi.fn(),
    getUserGuildPermissions: vi.fn(),
  } as unknown as GuildPermissions;

  const prismaDatabase = {
    ping: vi.fn(),
  };

  const createTestApp = () =>
    createApp({
      activityQuery,
      activityStore,
      guildPermissions,
      prismaDatabase: prismaDatabase as never,
    });

  it("returns 401 when auth headers are missing", async () => {
    const app = createTestApp();

    const response = await app.request("/guilds/guild-one/activity-logs");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Unauthorized" });
  });

  it("resolves guild id and returns guild activities", async () => {
    vi.mocked(guildPermissions.resolveGuildId).mockResolvedValue("guild-1");
    vi.mocked(guildPermissions.getUserGuildPermissions).mockResolvedValue([
      Permission.ADMIN,
    ]);
    vi.mocked(activityQuery.findByGuild).mockResolvedValue({
      data: [],
      hasMore: false,
    });

    const app = createTestApp();
    const response = await app.request(
      "/guilds/guild-one/activity-logs?limit=25",
      {
        headers: {
          "X-Auth-User-Id": "user-1",
          "X-Auth-Discord-Id": "discord-1",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(guildPermissions.resolveGuildId).toHaveBeenCalledWith("guild-one");
    expect(guildPermissions.getUserGuildPermissions).toHaveBeenCalledWith(
      "discord-1",
      "user-1",
      "guild-1",
    );
    expect(activityQuery.findByGuild).toHaveBeenCalledWith("guild-1", {
      limit: 25,
    });
  });

  it("returns 403 when user lacks required permissions", async () => {
    vi.mocked(guildPermissions.resolveGuildId).mockResolvedValue("guild-1");
    vi.mocked(guildPermissions.getUserGuildPermissions).mockResolvedValue([]);

    const app = createTestApp();
    const response = await app.request("/guilds/guild-one/activity-logs", {
      headers: {
        "X-Auth-User-Id": "user-1",
        "X-Auth-Discord-Id": "discord-1",
      },
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      message: "Insufficient permissions",
    });
    expect(activityQuery.findByGuild).not.toHaveBeenCalled();
  });

  it("requires OWNER permission for deleting an activity", async () => {
    vi.mocked(guildPermissions.resolveGuildId).mockResolvedValue("guild-1");
    vi.mocked(guildPermissions.getUserGuildPermissions).mockResolvedValue([
      Permission.OWNER,
    ]);
    vi.mocked(activityStore.deleteOne).mockResolvedValue(1);

    const app = createTestApp();
    const response = await app.request("/guilds/guild-one/activity-logs/id-1", {
      method: "DELETE",
      headers: {
        "X-Auth-User-Id": "user-1",
        "X-Auth-Discord-Id": "discord-1",
      },
    });

    expect(response.status).toBe(200);
    expect(activityStore.deleteOne).toHaveBeenCalledWith("id-1", "guild-1");
    expect(await response.json()).toEqual({ count: 1 });
  });
});
