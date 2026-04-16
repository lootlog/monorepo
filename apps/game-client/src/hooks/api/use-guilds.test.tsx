import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchGuilds } from "@/api";
import { queryKeys } from "@/features/public-api/query-keys";
import { getGuildIds, getGuildNamesById, useGuilds } from "./use-guilds";

const mockUseQuery = vi.fn();
const mockFetchGuilds = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

vi.mock("@/api", () => ({
  fetchGuilds: () => mockFetchGuilds(),
}));

describe("useGuilds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: [] });
  });

  it("configures the guilds query without refetching on remount", async () => {
    mockFetchGuilds.mockResolvedValue([{ id: "guild-1", name: "Alpha" }]);

    renderHook(() => useGuilds());

    expect(mockUseQuery).toHaveBeenCalledOnce();

    const options = mockUseQuery.mock.calls[0][0];

    expect(options.queryKey).toEqual(queryKeys.guilds());
    expect(options.refetchOnMount).toBe(false);
    expect(options.staleTime).toBe(1000 * 60 * 5);

    await expect(options.queryFn()).resolves.toEqual([
      { id: "guild-1", name: "Alpha" },
    ]);
    expect(mockFetchGuilds).toHaveBeenCalledOnce();
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
