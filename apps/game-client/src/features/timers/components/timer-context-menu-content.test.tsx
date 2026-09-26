import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { getGuildsControllerGetGuildPermissionsQueryKey } from "@lootlog/client/main";
import { Permission } from "@lootlog/schema/permissions";
import type { ComponentProps } from "react";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { createTimerFixture } from "../timer-fixtures";
import { createTimerHttpFixture } from "../timer-http-fixtures";
import { TimerContextMenuContent } from "./timer-context-menu-content";

type MenuProps = ComponentProps<typeof TimerContextMenuContent>;

const action = () => vi.fn<() => void>();

const createProps = (overrides: Partial<MenuProps> = {}): MenuProps => ({
  timer: { ...createTimerFixture(), minTimeLeft: 0, maxTimeLeft: 0 },
  isPending: false,
  isPinned: false,
  isHidden: false,
  canDelete: true,
  canReset: true,
  actionPending: false,
  guildNamesById: { "guild-1": "Alpha", "guild-2": "Beta" },
  timersGrouping: false,
  selectedColor: "red",
  customColors: {},
  defaultColorNames: {},
  overriddenDefaultColors: {},
  hiddenDefaultColors: [],
  isAlwaysVisibleExpiredTimer: false,
  onColorChange: vi.fn<MenuProps["onColorChange"]>(),
  onPin: action(),
  onPinAll: action(),
  onUnpinAll: action(),
  onHide: action(),
  onHideAll: action(),
  onShow: action(),
  onShowAll: action(),
  onToggleAlwaysVisibleExpiredTimer: action(),
  onReset: vi.fn<MenuProps["onReset"]>().mockResolvedValue(true),
  onResetBegin: action(),
  onDelete: vi.fn<MenuProps["onDelete"]>().mockResolvedValue(true),
  ...overrides,
});

const openMenu = () =>
  userEvent.pointer({
    keys: "[MouseRight]",
    target: screen.getByText("Timer"),
  });

const renderMenu = async (props: MenuProps) => {
  const fixture = createTimerHttpFixture();

  for (const guildId of ["guild-1", "guild-2"]) {
    fixture.queryClient.setQueryData(
      getGuildsControllerGetGuildPermissionsQueryKey({ guildId }),
      [Permission.LOOTLOG_TIMERS_DELETE],
    );
  }

  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <ContextMenu>
        <ContextMenuTrigger>Timer</ContextMenuTrigger>
        <ContextMenuContent>
          <TimerContextMenuContent {...props} />
        </ContextMenuContent>
      </ContextMenu>
    </QueryClientProvider>,
  );

  onTestFinished(() => {
    view.unmount();
    fixture.cleanup();
  });
  await openMenu();
};

describe("TimerContextMenuContent", () => {
  it("shows a pending placeholder instead of timer actions", async () => {
    await renderMenu(createProps({ isPending: true }));
    expect(screen.getByText("Tworzenie timera…")).toBeVisible();
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
  });

  it("invokes direct actions with the correct timer identity", async () => {
    const user = userEvent.setup();
    const props = createProps();
    await renderMenu(props);
    expect(screen.getByRole("menuitem", { name: "Historia" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Czerwony" }));
    expect(props.onColorChange).toHaveBeenCalledWith("red");
    await user.click(screen.getByRole("menuitem", { name: "Usuń timer" }));
    expect(props.onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Usuń" }));
    expect(props.onDelete).toHaveBeenCalledWith("guild-1", "timer-1");
  });

  it.each([
    ["Przypnij", "onPin"],
    ["Przypnij we wszystkich Lootlogach", "onPinAll"],
    ["Ukryj", "onHide"],
    ["Ukryj we wszystkich Lootlogach", "onHideAll"],
    ["Zostaw po wyzerowaniu", "onToggleAlwaysVisibleExpiredTimer"],
  ] as const)("invokes the %s action", async (name, callback) => {
    const props = createProps();
    await renderMenu(props);
    await userEvent.click(screen.getByRole("menuitem", { name }));
    expect(props[callback]).toHaveBeenCalledOnce();
  });

  it("requires confirmation before resetting and allows retry after a failure", async () => {
    const user = userEvent.setup();

    const onReset = vi
      .fn<MenuProps["onReset"]>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await renderMenu(createProps({ onReset }));
    await user.click(screen.getByRole("menuitem", { name: "Zresetuj timer" }));
    expect(onReset).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Anuluj" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(onReset).not.toHaveBeenCalled();
    await user.click(screen.getByRole("menuitem", { name: "Zresetuj timer" }));
    await user.click(screen.getByRole("button", { name: "Zresetuj" }));
    expect(screen.getByRole("alertdialog")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Zresetuj" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(onReset).toHaveBeenCalledTimes(2);
  });

  it("does not submit a second reset while the first confirmation is running", async () => {
    const user = userEvent.setup();
    const request = Promise.withResolvers<boolean>();

    const onReset = vi
      .fn<MenuProps["onReset"]>()
      .mockReturnValue(request.promise);

    await renderMenu(createProps({ onReset }));
    await user.click(screen.getByRole("menuitem", { name: "Zresetuj timer" }));
    await user.dblClick(screen.getByRole("button", { name: "Zresetuj" }));
    expect(onReset).toHaveBeenCalledOnce();
    request.resolve(true);
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
  });

  it("offers grouped deletion per organization and can reverse persistent visibility", async () => {
    const user = userEvent.setup();

    const timer = {
      ...createTimerFixture(),
      minTimeLeft: 0,
      maxTimeLeft: 0,
      mergedGuildIds: [
        { guildId: "guild-1", npcId: 10, timerKey: "timer-1" },
        { guildId: "guild-2", npcId: 10, timerKey: "timer-2" },
      ],
    };

    const props = createProps({
      timer,
      timersGrouping: true,
      isPinned: true,
      isHidden: true,
      isAlwaysVisibleExpiredTimer: true,
    });

    await renderMenu(props);
    expect(
      screen.queryByRole("menuitem", { name: "Historia" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("menuitem", { name: "Usuwaj po wyzerowaniu" }),
    );
    expect(props.onToggleAlwaysVisibleExpiredTimer).toHaveBeenCalledOnce();
    await openMenu();
    await user.click(screen.getByRole("menuitem", { name: "Usuń timer" }));
    await user.click(await screen.findByRole("button", { name: "guild-2" }));
    expect(props.onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Usuń" }));
    expect(props.onDelete).toHaveBeenCalledWith("guild-2", "timer-2");
  });

  it("omits history and persistent expiry visibility for manual timers", async () => {
    const timer = createTimerFixture();
    await renderMenu(
      createProps({
        timer: {
          ...timer,
          minTimeLeft: 0,
          maxTimeLeft: 0,
          npc: { ...timer.npc, margonemType: 999 },
        },
      }),
    );
    expect(
      screen.queryByRole("menuitem", { name: "Historia" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Zostaw po wyzerowaniu" }),
    ).not.toBeInTheDocument();
  });
});
