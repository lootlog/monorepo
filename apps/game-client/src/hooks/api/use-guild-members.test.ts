import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosInstance } from "axios";
import {
  fetchGuildMembers,
  mapGuildMembersByUserId,
  type GuildMember,
} from "@/api";
import { getApiClient } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  getApiClient: vi.fn(),
}));

const getApiClientMock = vi.mocked(getApiClient);

const guildMembers: GuildMember[] = [
  {
    id: 1,
    userId: "user-1",
    name: "Alpha",
    color: 111111,
  },
  {
    id: 2,
    userId: "user-2",
    name: "Beta",
    avatar: "avatar.png",
  },
];

describe("useGuildMembers helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps guild members by user id", () => {
    expect(mapGuildMembersByUserId(guildMembers)).toEqual({
      "user-1": guildMembers[0],
      "user-2": guildMembers[1],
    });
  });

  it("fetches guild members and returns the mapped record", async () => {
    const get = vi.fn().mockResolvedValue({ data: guildMembers });
    getApiClientMock.mockReturnValue({ get } as Pick<
      AxiosInstance,
      "get"
    > as AxiosInstance);

    await expect(fetchGuildMembers("guild-1")).resolves.toEqual({
      "user-1": guildMembers[0],
      "user-2": guildMembers[1],
    });

    expect(getApiClientMock).toHaveBeenCalledWith("default");
    expect(get).toHaveBeenCalledWith("/guilds/guild-1/members/summary");
  });
});
