import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
} from "@lootlog/client/main";
import { Permission } from "@lootlog/schema/permissions";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import { queryKeys } from "@/features/public-api/query-keys";
import { useTimersWindowModel } from "@/features/timers/hooks/use-timers-window-model";
import {
  createTimerFixture,
  createTimerGuildFixture,
  createTimerMemberFixture,
} from "@/features/timers/model/timer-fixtures";
import {
  createTimerViewFixture,
  seedGuildTimerLists,
  seedTimerSettings,
} from "@/features/timers/model/timer-view-fixtures";
import type { SettingsDocumentValues } from "@/test/settings-documents-fixtures";
import { TimersActions } from "../shared/timers-actions";
import { LegacyTimersGrid } from "./legacy-timers-grid";

const NOW = Date.parse("2026-04-22T10:00:00.000Z");

const createTimer = (name: string, guildId = "guild-1") => {
  const timer = createTimerFixture({
    guildId,
    world: "gefion",
    timerKey: name,
    minSpawnTime: new Date(NOW + 5000).toISOString(),
    maxSpawnTime: new Date(NOW + 10000).toISOString(),
    wasReset: name === "Tanroth",
    member: createTimerMemberFixture(),
  });

  return { ...timer, npc: { ...timer.npc, name } };
};

const GridHarness = () => {
  const model = useTimersWindowModel("window", true);

  return (
    <>
      <TimersActions toolbar={model.toolbar} />
      <LegacyTimersGrid model={model} />
    </>
  );
};

const showHiddenTimers = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Pokaż ukryte timery" }));

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const mountGrid = (
  timers: ReturnType<typeof createTimer>[],
  settings: SettingsDocumentValues = {},
  respond?: Parameters<typeof createTimerViewFixture>[1],
) => {
  const fixture = createTimerViewFixture(timers, respond);
  seedGuildTimerLists(fixture.queryClient, {
    "guild-1": { hiddenTimers: ["Mushita"] },
  });
  seedTimerSettings(fixture.queryClient, {
    "timers.hiddenTimers": ["Mushita"],
    ...settings,
  });

  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <GridHarness />
    </QueryClientProvider>,
  );

  onTestFinished(() => {
    view.unmount();
    fixture.cleanup();
  });

  return { fixture, view };
};

it("renders guild metadata and hidden state and applies each organization's real permissions response", async () => {
  const user = userEvent.setup();

  const { fixture, view } = mountGrid(
    [
      createTimer("Tanroth"),
      createTimer("Mushita"),
      createTimer("Furruk", "guild-2"),
    ],
    { "appearance.timers.timersColors": { Tanroth: "red" } },
    (request) =>
      Response.json(
        new URL(request.url).pathname.includes("guild-1")
          ? [Permission.LOOTLOG_TIMERS_DELETE]
          : [Permission.LOOTLOG_TIMERS_RESET],
      ),
  );

  fixture.queryClient.removeQueries({
    queryKey: getGuildsControllerGetGuildPermissionsQueryKey({
      guildId: "guild-1",
    }),
  });
  fixture.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [createTimerGuildFixture()],
  );
  seedTimerSettings(fixture.queryClient, {
    "timers.generalConfig": { timersGrouping: true },
  });
  await waitFor(() => expect(fixture.requests).toHaveLength(2));
  expect(
    fixture.requests.map((request) => new URL(request.url).pathname).sort(),
  ).toEqual(["/guilds/guild-1/permissions", "/guilds/guild-2/permissions"]);
  expect(screen.queryByText(/Mushita/)).not.toBeInTheDocument();
  await showHiddenTimers(user);
  const label = screen.getByText(/\[R\] \[H\] Tanroth/);
  expect(screen.getAllByText("00:00:10")).toHaveLength(3);
  expect(view.container.querySelector('[id="10"]')).toHaveClass(
    "ll:bg-red-500/20",
  );
  const hidden = screen.getByText(/Mushita/).closest('[id="10"]');
  expect(hidden?.parentElement).toHaveClass("ll:opacity-50");
  await user.hover(label);
  expect(await screen.findByText("Tester (Alpha)")).toBeVisible();
  await user.pointer({ keys: "[MouseRight]", target: label });
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

it("shows pending and hidden states with the configured custom color", async () => {
  const user = userEvent.setup();

  const { view } = mountGrid([{ ...createTimer("Mushita"), isPending: true }], {
    "appearance.timers.timersColors": { Mushita: "custom-1" },
    "appearance.timers.customColors": {
      "custom-1": {
        id: "custom-1",
        name: "Custom",
        borderColor: "#111111",
        backgroundColor: "#222222",
      },
    },
  });

  await showHiddenTimers(user);
  const tile = view.container.querySelector('[id="10"]');
  expect(tile).toHaveStyle({
    borderColor: "#111111",
    backgroundColor: "#222222",
  });
  expect(tile?.parentElement).toHaveClass("ll:opacity-50");
  expect(screen.getByText("00:00:10").parentElement).toHaveClass(
    "ll:opacity-60",
  );
  await user.pointer({
    keys: "[MouseRight]",
    target: screen.getByText(/Mushita/),
  });
  expect(await screen.findByText("Tworzenie timera...")).toBeVisible();
  expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
});

it("updates twenty countdowns without adding permission observers or remounting tiles", () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);

  const permissionKey = getGuildsControllerGetGuildPermissionsQueryKey({
    guildId: "guild-1",
  });

  const { fixture } = mountGrid(
    Array.from({ length: 20 }, (_, i) => createTimer(`Timer ${i}`)),
  );

  fixture.queryClient.setQueryData(permissionKey, [
    Permission.LOOTLOG_TIMERS_DELETE,
  ]);

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
  expect(
    fixture.queryClient.getQueryData(queryKeys.timers("gefion")),
  ).toHaveLength(20);
});
