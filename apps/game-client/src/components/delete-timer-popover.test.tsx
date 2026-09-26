import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { expect, it, onTestFinished, vi } from "vitest";
import { Permission } from "@lootlog/schema/permissions";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
} from "@lootlog/client/main";
import { createTimerHttpFixture } from "@/features/timers/timer-http-fixtures";
import {
  createTimerFixture,
  createTimerGuildFixture,
} from "@/features/timers/timer-fixtures";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
} from "./ui/context-menu";
import { DeleteTimerPopover } from "./delete-timer-popover";

const setup = async (permissions: Permission[][] | null) => {
  const fixture = createTimerHttpFixture(
    () => new Promise<Response>(() => undefined),
  );

  onTestFinished(fixture.cleanup);
  fixture.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [
      createTimerGuildFixture(),
      createTimerGuildFixture({ id: "guild-2", name: "Beta" }),
    ],
  );
  permissions?.forEach((data, index) =>
    fixture.queryClient.setQueryData(
      getGuildsControllerGetGuildPermissionsQueryKey({
        guildId: `guild-${index + 1}`,
      }),
      data,
    ),
  );

  const onDeleteTimer = vi
    .fn<(guildId: string, timerKey: string) => Promise<boolean>>()
    .mockResolvedValue(true);

  const timer = {
    ...createTimerFixture(),
    minTimeLeft: 0,
    maxTimeLeft: 0,
    mergedGuildIds: [
      { guildId: "guild-1", npcId: 10, timerKey: "timer-1" },
      { guildId: "guild-2", npcId: 10, timerKey: "timer-2" },
    ],
  };

  render(
    <QueryClientProvider client={fixture.queryClient}>
      <ContextMenu>
        <ContextMenuTrigger>Timer</ContextMenuTrigger>
        <ContextMenuContent>
          <DeleteTimerPopover
            timer={timer}
            onDeleteTimer={onDeleteTimer}
            pending={false}
          />
        </ContextMenuContent>
      </ContextMenu>
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.pointer({
    target: screen.getByText("Timer"),
    keys: "[MouseRight]",
  });

  return { user, onDeleteTimer };
};

it("hides deletion when neither organization permits it", async () => {
  await setup([[], []]);
  expect(screen.queryByText("Usuń timer")).not.toBeInTheDocument();
});

it("shows pending permissions without exposing deletion", async () => {
  await setup(null);
  expect(screen.getByText("Sprawdzanie uprawnień…")).toBeVisible();
  expect(screen.queryByText("Usuń timer")).not.toBeInTheDocument();
});

it("deletes a single organization's timer only after confirmation", async () => {
  const { user, onDeleteTimer } = await setup([
    [Permission.LOOTLOG_TIMERS_DELETE],
    [],
  ]);

  const gameKeyDown = vi.fn<(event: KeyboardEvent) => void>();
  document.addEventListener("keydown", gameKeyDown);
  onTestFinished(() => document.removeEventListener("keydown", gameKeyDown));

  await user.click(screen.getByRole("menuitem", { name: "Usuń timer" }));
  expect(screen.getByRole("alertdialog")).toBeVisible();
  expect(screen.getByRole("button", { name: "Anuluj" })).toHaveFocus();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  // Margonem reacts to document key presses, so Escape stays with Lootlog.
  expect(gameKeyDown).not.toHaveBeenCalled();

  await user.click(screen.getByRole("menuitem", { name: "Usuń timer" }));
  await user.click(screen.getByRole("button", { name: "Anuluj" }));
  expect(onDeleteTimer).not.toHaveBeenCalled();

  await user.click(screen.getByRole("menuitem", { name: "Usuń timer" }));
  await user.click(screen.getByRole("button", { name: "Usuń" }));
  expect(onDeleteTimer).toHaveBeenCalledWith("guild-1", "timer-1");
});

it("keeps the organization chooser open until its target is selected", async () => {
  const { user, onDeleteTimer } = await setup([
    [Permission.ADMIN],
    [Permission.OWNER],
  ]);

  await user.click(screen.getByRole("menuitem", { name: "Usuń timer" }));
  expect(
    screen.getByText("Wybierz Lootlog, z którego usunąć timer:"),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Beta" }));
  expect(onDeleteTimer).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Anuluj" }));
  expect(onDeleteTimer).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Beta" }));
  await user.click(screen.getByRole("button", { name: "Usuń" }));
  expect(onDeleteTimer).toHaveBeenCalledWith("guild-2", "timer-2");
});
