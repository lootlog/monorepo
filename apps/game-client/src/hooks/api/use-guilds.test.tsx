import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { API_URL } from "@/config/api";
import { queryKeys } from "@/features/public-api/query-keys";
import { getGuildIds, getGuildNamesById, useGuilds } from "./use-guilds";

const mockUseQuery = vi.fn();
const mockGet = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

vi.mock("@/hooks/api/use-api-client", () => ({
  useAuthenticatedApiClient: () => ({
    client: {
      get: mockGet,
    },
  }),
}));

describe("useGuilds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: [] });
  });

  it("configures the guilds query without refetching on remount", async () => {
    mockGet.mockResolvedValue({ data: [{ id: "guild-1", name: "Alpha" }] });

    renderHook(() => useGuilds());

    expect(mockUseQuery).toHaveBeenCalledOnce();

    const options = mockUseQuery.mock.calls[0][0];

    expect(options.queryKey).toEqual(queryKeys.guilds());
    expect(options.refetchOnMount).toBe(false);
    expect(options.staleTime).toBe(1000 * 60 * 5);
    expect(options.select({ data: ["guild-1"] })).toEqual(["guild-1"]);

    await expect(options.queryFn()).resolves.toEqual({
      data: [{ id: "guild-1", name: "Alpha" }],
    });

    expect(mockGet).toHaveBeenCalledWith(`${API_URL}/guilds/@me?source=game`, {
      withCredentials: true,
    });
  });

  it("maps guild ids and names", () => {
    const guilds = [
      { id: "guild-1", name: "Alpha", icon: null },
      { id: "guild-2", name: "Beta", icon: "beta.png" },
    ];

    expect(getGuildIds(guilds)).toEqual(["guild-1", "guild-2"]);
    expect(getGuildNamesById(guilds)).toEqual({
      "guild-1": "Alpha",
      "guild-2": "Beta",
    });
    expect(getGuildIds()).toEqual([]);
    expect(getGuildNamesById()).toEqual({});
  });
});
