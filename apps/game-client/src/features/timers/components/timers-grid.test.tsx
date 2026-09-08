import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getGuildsControllerGetGuildPermissionsQueryKey,
} from "@lootlog/client/main";
import { Permission } from "@lootlog/schema/permissions";
import { beforeEach, afterEach, expect, it, onTestFinished, vi } from "vitest";
import { useTimersStore } from "@/store/timers.store";
import {
  createTimerFixture,
  createTimerGuildFixture,
  createTimerMemberFixture,
} from "../timer-fixtures";
import { createTimerHttpFixture } from "../timer-http-fixtures";
import { TimersGrid } from "./timers-grid";

const NOW = Date.parse("2026-04-22T10:00:00.000Z");
const createTimer = (name: string, guildId = "guild-1") => {
  const timer = createTimerFixture({
    guildId,
    timerKey: name,
    minSpawnTime: new Date(NOW + 5000).toISOString(),
    maxSpawnTime: new Date(NOW + 10000).toISOString(),
  });
  return {
    ...timer,
    npc: { ...timer.npc, name },
    members: [createTimerMemberFixture()],
    minTimeLeft: 5000,
    maxTimeLeft: 10000,
  };
};
beforeEach(() => {
  useTimersStore.setState(useTimersStore.getInitialState(), true);
  vi.spyOn(Date, "now").mockReturnValue(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("renders guild metadata and hidden state and applies each organization's real permissions response", async () => {
  const user = userEvent.setup();
  const fixture = createTimerHttpFixture((request) =>
    Response.json(
      new URL(request.url).pathname.includes("guild-1")
        ? [Permission.LOOTLOG_TIMERS_DELETE]
        : [Permission.LOOTLOG_TIMERS_RESET],
    ),
  );
  fixture.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [createTimerGuildFixture()],
  );
  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <TimersGrid
        timers={[
          createTimer("Tanroth"),
          createTimer("Mushita"),
          createTimer("Furruk", "guild-2"),
        ]}
        settingsKey="guild-1"
        hiddenTimers={["Mushita"]}
        minColumnWidth={120}
      />
    </QueryClientProvider>,
  );
  onTestFinished(() => {
    view.unmount();
    fixture.cleanup();
  });
  await waitFor(() => expect(fixture.requests).toHaveLength(2));
  expect(
    fixture.requests.map((request) => new URL(request.url).pathname).sort(),
  ).toEqual(["/guilds/guild-1/permissions", "/guilds/guild-2/permissions"]);
  const hidden = screen.getByText(/Mushita/).closest('[id="10"]');
  expect(hidden?.parentElement).toHaveClass("ll:opacity-50");
  await user.hover(screen.getByText(/Tanroth/));
  expect(await screen.findByText("Tester (Alpha)")).toBeVisible();
  await user.pointer({
    keys: "[MouseRight]",
    target: screen.getByText(/\[H\] Tanroth/),
  });
  expect(
    await screen.findByRole("menuitem", { name: "Usuń timer" }),
  ).toBeVisible();
  expect(
    screen.queryByRole("menuitem", { name: "Odliczaj od początku" }),
  ).not.toBeInTheDocument();
  await user.keyboard("{Escape}");
  await user.pointer({
    keys: "[MouseRight]",
    target: screen.getByText(/Furruk/),
  });
  expect(
    await screen.findByRole("menuitem", { name: "Odliczaj od początku" }),
  ).toBeVisible();
  expect(
    screen.queryByRole("menuitem", { name: "Usuń timer" }),
  ).not.toBeInTheDocument();
});

it("updates twenty countdowns without adding permission observers or remounting tiles", () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  const fixture = createTimerHttpFixture();
  const permissionKey = getGuildsControllerGetGuildPermissionsQueryKey({
    guildId: "guild-1",
  });
  fixture.queryClient.setQueryData(permissionKey, [
    Permission.LOOTLOG_TIMERS_DELETE,
  ]);
  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <TimersGrid
        timers={Array.from({ length: 20 }, (_, i) => createTimer(`Timer ${i}`))}
        settingsKey="guild-1"
        hiddenTimers={[]}
        minColumnWidth={120}
      />
    </QueryClientProvider>,
  );
  onTestFinished(() => {
    view.unmount();
    fixture.cleanup();
  });
  const query = fixture.queryClient
    .getQueryCache()
    .find({ queryKey: permissionKey });
  expect(query?.getObserversCount()).toBe(1);
  const labels = screen.getAllByText(/\[H\] Timer/);
  expect(screen.getAllByText("00:00:10")).toHaveLength(20);
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getAllByText("00:00:09")).toHaveLength(20);
  expect(screen.getAllByText(/\[H\] Timer/)).toEqual(labels);
  expect(query?.getObserversCount()).toBe(1);
  expect(fixture.requests).toHaveLength(0);
});
