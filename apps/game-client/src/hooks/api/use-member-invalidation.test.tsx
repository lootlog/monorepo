import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MemberSummaryResponseDtoOutput } from "@/lib/api/generated/main/model";
import { useMemberInvalidation } from "./use-member-invalidation";

const mocks = vi.hoisted(() => ({
  data: [] as MemberSummaryResponseDtoOutput[],
  invalidateQueries: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock("@/hooks/api/guild-members-summary-query", () => ({
  getGuildMembersSummaryQueryKey: ({ guildId }: { guildId: string }) => [
    "members",
    guildId,
  ],
  useGuildMembersSummary: () => ({ data: mocks.data }),
}));

const createMember = (userId: string): MemberSummaryResponseDtoOutput =>
  ({ userId }) as MemberSummaryResponseDtoOutput;

describe("useMemberInvalidation", () => {
  beforeEach(() => {
    mocks.data = [];
    mocks.invalidateQueries.mockClear();
  });

  it("invalidates again when a member disappears after becoming present", () => {
    const { rerender } = renderHook(
      ({ memberIds }) => useMemberInvalidation("guild-1", memberIds),
      { initialProps: { memberIds: ["member-1"] } },
    );

    expect(mocks.invalidateQueries).toHaveBeenCalledTimes(1);

    rerender({ memberIds: ["member-1"] });
    expect(mocks.invalidateQueries).toHaveBeenCalledTimes(1);

    mocks.data = [createMember("member-1")];
    rerender({ memberIds: [] });

    mocks.data = [];
    rerender({ memberIds: ["member-1"] });

    expect(mocks.invalidateQueries).toHaveBeenCalledTimes(2);
    expect(mocks.invalidateQueries).toHaveBeenLastCalledWith({
      queryKey: ["members", "guild-1"],
    });
  });

  it("resets checked identities when the guild context changes or disappears", () => {
    const { rerender } = renderHook(
      ({ guildId, memberIds }) => useMemberInvalidation(guildId, memberIds),
      {
        initialProps: {
          guildId: "guild-1" as string | undefined,
          memberIds: ["member-1"],
        },
      },
    );

    rerender({ guildId: "guild-2", memberIds: ["member-1"] });
    rerender({ guildId: undefined, memberIds: [] });
    rerender({ guildId: "guild-1", memberIds: ["member-1"] });

    expect(mocks.invalidateQueries.mock.calls).toEqual([
      [{ queryKey: ["members", "guild-1"] }],
      [{ queryKey: ["members", "guild-2"] }],
      [{ queryKey: ["members", "guild-1"] }],
    ]);
  });
});
