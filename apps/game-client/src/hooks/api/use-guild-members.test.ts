import { describe, expect, it, vi } from "vitest";
import type { AxiosInstance } from "axios";
import {
  fetchGuildMembers,
  mapGuildMembersByUserId,
  type GuildMember,
} from "./use-guild-members";

const guildMembers: GuildMember[] = [
  {
    id: 1,
    userId: "user-1",
    guildId: "guild-1",
    type: "member",
    name: "Alpha",
  },
  {
    id: 2,
    userId: "user-2",
    guildId: "guild-1",
    type: "leader",
    name: "Beta",
    avatar: "avatar.png",
  },
];

describe("useGuildMembers helpers", () => {
  it("maps guild members by user id", () => {
    expect(mapGuildMembersByUserId(guildMembers)).toEqual({
      "user-1": guildMembers[0],
      "user-2": guildMembers[1],
    });
  });

  it("fetches guild members and returns the mapped record", async () => {
    const get = vi.fn().mockResolvedValue({ data: guildMembers });
    const client = { get } as Pick<AxiosInstance, "get"> as AxiosInstance;

    await expect(fetchGuildMembers(client, "guild-1")).resolves.toEqual({
      "user-1": guildMembers[0],
      "user-2": guildMembers[1],
    });

    expect(get).toHaveBeenCalledWith("/guilds/guild-1/members");
  });
});
