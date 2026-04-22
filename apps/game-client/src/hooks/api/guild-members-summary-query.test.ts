import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getGuildMembersSummaryQueryKey,
  getGuildMembersSummaryQueryOptions,
  GUILD_MEMBERS_SUMMARY_STALE_TIME,
} from "./guild-members-summary-query";

const mockMembersControllerGetGuildMembersSummary = vi.fn();

vi.mock("@/lib/api/generated/main/members/members", () => ({
  getMembersControllerGetGuildMembersSummaryQueryKey: ({
    guildId,
  }: {
    guildId: string;
  }) => ["guild-members-summary", guildId],
  getMembersControllerGetGuildMembersSummaryQueryOptions: (
    { guildId }: { guildId: string },
    options?: { query?: Record<string, unknown> },
  ) => ({
    queryKey: ["guild-members-summary", guildId],
    queryFn: () => mockMembersControllerGetGuildMembersSummary({ guildId }),
    enabled: Boolean(guildId),
    ...options?.query,
  }),
  useMembersControllerGetGuildMembersSummary: vi.fn(),
}));

describe("guild-members-summary-query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies shared cache defaults", () => {
    const options = getGuildMembersSummaryQueryOptions({ guildId: "guild-1" });

    expect(getGuildMembersSummaryQueryKey({ guildId: "guild-1" })).toEqual([
      "guild-members-summary",
      "guild-1",
    ]);
    expect(options.queryKey).toEqual(["guild-members-summary", "guild-1"]);
    expect(options.staleTime).toBe(GUILD_MEMBERS_SUMMARY_STALE_TIME);
    expect(options.gcTime).toBe(Infinity);
  });

  it("preserves caller query options", () => {
    const select = vi.fn((members: Array<{ userId: string }>) =>
      members.map((member) => member.userId),
    );
    const options = getGuildMembersSummaryQueryOptions(
      { guildId: "guild-1" },
      {
        query: {
          enabled: false,
          select,
        },
      },
    );

    expect(options.enabled).toBe(false);
    expect(options.select).toBe(select);
    expect(options.staleTime).toBe(GUILD_MEMBERS_SUMMARY_STALE_TIME);
    expect(options.gcTime).toBe(Infinity);
  });

  it("allows explicit overrides to win", () => {
    const options = getGuildMembersSummaryQueryOptions(
      { guildId: "guild-1" },
      {
        query: {
          gcTime: 1_000,
          staleTime: 2_000,
        },
      },
    );

    expect(options.gcTime).toBe(1_000);
    expect(options.staleTime).toBe(2_000);
  });

  it("reuses fresh cache for repeated fetches", async () => {
    mockMembersControllerGetGuildMembersSummary.mockResolvedValue([
      { userId: "user-1" },
    ]);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
        },
      },
    });

    await queryClient.fetchQuery(
      getGuildMembersSummaryQueryOptions({ guildId: "guild-1" }),
    );
    await queryClient.fetchQuery(
      getGuildMembersSummaryQueryOptions({ guildId: "guild-1" }),
    );

    expect(mockMembersControllerGetGuildMembersSummary).toHaveBeenCalledTimes(
      1,
    );
  });
});
