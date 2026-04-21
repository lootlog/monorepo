import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const deleteTimerPopoverSpy = vi.fn();

vi.mock("@/components/ui/context-menu", () => ({
  ContextMenuItem: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("./timer-color-picker", () => ({
  TimerColorPicker: ({ selectedColor }: { selectedColor: string }) => (
    <div>TimerColorPicker:{selectedColor}</div>
  ),
}));

vi.mock("@/components/delete-timer-popover", () => ({
  DeleteTimerPopover: (props: unknown) => {
    deleteTimerPopoverSpy(props);
    return <div>DeleteTimerPopover</div>;
  },
}));

vi.mock("lucide-react", () => ({
  Delete: () => <span>Delete</span>,
  Eye: () => <span>Eye</span>,
  EyeOff: () => <span>EyeOff</span>,
  Globe: () => <span>Globe</span>,
  Loader2: () => <span>Loader2</span>,
  Pin: () => <span>Pin</span>,
  PinOff: () => <span>PinOff</span>,
  RotateCcw: () => <span>RotateCcw</span>,
  Trash2: () => <span>Trash2</span>,
}));

import { TimerContextMenuContent } from "./timer-context-menu-content";

const timer = {
  guildId: "guild-1",
  timerKey: "timer-1",
  npc: {
    name: "Tanroth",
  },
} as never;

describe("TimerContextMenuContent", () => {
  it("shows a pending placeholder while a timer is being created", () => {
    render(
      <TimerContextMenuContent
        timer={timer}
        isPending
        isPinned={false}
        isHidden={false}
        canDelete={false}
        canReset={false}
        timersGrouping={false}
        selectedColor="red"
        customColors={{}}
        defaultColorNames={{}}
        overriddenDefaultColors={{}}
        hiddenDefaultColors={[]}
        onColorChange={vi.fn()}
        onPin={vi.fn()}
        onPinAll={vi.fn()}
        onUnpinAll={vi.fn()}
        onHide={vi.fn()}
        onHideAll={vi.fn()}
        onShow={vi.fn()}
        onShowAll={vi.fn()}
        onReset={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Tworzenie timera...")).toBeInTheDocument();
  });

  it("renders direct actions for non-grouped timers and forwards clicks", async () => {
    const user = userEvent.setup();
    const onColorChange = vi.fn();
    const onPin = vi.fn();
    const onPinAll = vi.fn();
    const onHide = vi.fn();
    const onHideAll = vi.fn();
    const onReset = vi.fn();
    const onDelete = vi.fn();

    render(
      <TimerContextMenuContent
        timer={timer}
        isPending={false}
        isPinned={false}
        isHidden={false}
        canDelete
        canReset
        timersGrouping={false}
        selectedColor="red"
        customColors={{}}
        defaultColorNames={{}}
        overriddenDefaultColors={{}}
        hiddenDefaultColors={[]}
        onColorChange={onColorChange}
        onPin={onPin}
        onPinAll={onPinAll}
        onUnpinAll={vi.fn()}
        onHide={onHide}
        onHideAll={onHideAll}
        onShow={vi.fn()}
        onShowAll={vi.fn()}
        onReset={onReset}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText("TimerColorPicker:red")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Przypnij$/ }));
    await user.click(
      screen.getByRole("button", { name: /Przypnij wszędzie$/ }),
    );
    await user.click(screen.getByRole("button", { name: /Ukryj$/ }));
    await user.click(screen.getByRole("button", { name: /Ukryj wszędzie$/ }));
    await user.click(
      screen.getByRole("button", { name: /Odliczaj od początku$/ }),
    );
    await user.click(screen.getByRole("button", { name: /Usuń timer$/ }));

    expect(onPin).toHaveBeenCalledTimes(1);
    expect(onPinAll).toHaveBeenCalledTimes(1);
    expect(onHide).toHaveBeenCalledTimes(1);
    expect(onHideAll).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith("guild-1", "timer-1");
  });

  it("uses the grouped delete popover instead of direct delete actions", () => {
    render(
      <TimerContextMenuContent
        timer={timer}
        isPending={false}
        isPinned
        isHidden
        canDelete
        canReset={false}
        timersGrouping
        selectedColor="red"
        customColors={{}}
        defaultColorNames={{}}
        overriddenDefaultColors={{}}
        hiddenDefaultColors={[]}
        onColorChange={vi.fn()}
        onPin={vi.fn()}
        onPinAll={vi.fn()}
        onUnpinAll={vi.fn()}
        onHide={vi.fn()}
        onHideAll={vi.fn()}
        onShow={vi.fn()}
        onShowAll={vi.fn()}
        onReset={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("DeleteTimerPopover")).toBeInTheDocument();
    expect(deleteTimerPopoverSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        timer,
      }),
    );
  });
});
