import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { createChatMember } from "@/features/chat/chat-test-fixtures";
import { getGuildMembersSummaryQueryKey } from "./guild-members-summary-query";
import { useMemberInvalidation } from "./use-member-invalidation";

const setup = () => {
  const fixture = createGuildPreferencesTest();
  fixture.request.mockImplementation(() => Promise.resolve(Response.json([])));

  for (const guildId of ["guild-1", "guild-2"])
    fixture.queryClient.setQueryData(
      getGuildMembersSummaryQueryKey({ guildId }),
      [],
    );

  return fixture;
};

it("refetches a missing member again after the member disappears", async () => {
  const fixture = setup();

  const { rerender } = renderHook(
    ({ memberIds }) => useMemberInvalidation("guild-1", memberIds),
    { wrapper: fixture.wrapper, initialProps: { memberIds: ["member-1"] } },
  );

  await waitFor(() => expect(fixture.request).toHaveBeenCalledTimes(1));
  rerender({ memberIds: ["member-1"] });
  expect(fixture.request).toHaveBeenCalledTimes(1);
  await act(async () => {
    fixture.queryClient.setQueryData(
      getGuildMembersSummaryQueryKey({ guildId: "guild-1" }),
      [createChatMember({ userId: "member-1" })],
    );
    await Promise.resolve();
  });
  rerender({ memberIds: [] });
  act(() =>
    fixture.queryClient.setQueryData(
      getGuildMembersSummaryQueryKey({ guildId: "guild-1" }),
      [],
    ),
  );
  rerender({ memberIds: ["member-1"] });
  await waitFor(() => expect(fixture.request).toHaveBeenCalledTimes(2));
});

it("resets checked identities when organization context changes or disappears", async () => {
  const fixture = setup();

  const { rerender } = renderHook<
    void,
    { guildId: string | undefined; memberIds: string[] }
  >(({ guildId, memberIds }) => useMemberInvalidation(guildId, memberIds), {
    wrapper: fixture.wrapper,
    initialProps: { guildId: "guild-1", memberIds: ["member-1"] },
  });

  await waitFor(() => expect(fixture.request).toHaveBeenCalledTimes(1));
  rerender({ guildId: "guild-2", memberIds: ["member-1"] });
  await waitFor(() => expect(fixture.request).toHaveBeenCalledTimes(2));
  rerender({ guildId: undefined, memberIds: [] });
  rerender({ guildId: "guild-1", memberIds: ["member-1"] });
  await waitFor(() => expect(fixture.request).toHaveBeenCalledTimes(3));
  expect(
    fixture.request.mock.calls.map(
      ([input, init]) => new URL(new Request(input, init).url).pathname,
    ),
  ).toEqual([
    "/guilds/guild-1/members/summary",
    "/guilds/guild-2/members/summary",
    "/guilds/guild-1/members/summary",
  ]);
});
