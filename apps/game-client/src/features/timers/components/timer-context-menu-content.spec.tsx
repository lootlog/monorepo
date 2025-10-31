import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/test/test-utils";
import type { Timer } from "@/hooks/api/use-timers";
import { TimerContextMenuContent } from "./timer-context-menu-content";
import { createMockTimer } from "../__tests__/test-helpers";

vi.mock("@/components/ui/context-menu", () => ({
  ContextMenuItem: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} data-disabled={disabled || undefined}>
      {children}
    </button>
  ),
}));

vi.mock("@/hooks/api/use-guilds", () => ({
  useGuilds: () => ({ data: [] }),
}));

describe("TimerContextMenuContent", () => {
  const mockTimer = createMockTimer();

  const defaultProps = {
    timer: mockTimer,
    isPending: false,
    isPinned: false,
    isHidden: false,
    canDelete: true,
    timersGrouping: false,
    selectedColor: "white",
    customColors: {},
    defaultColorNames: {},
    overriddenDefaultColors: {},
    hiddenDefaultColors: [],
    onColorChange: vi.fn(),
    onPin: vi.fn(),
    onPinAll: vi.fn(),
    onUnpinAll: vi.fn(),
    onHide: vi.fn(),
    onHideAll: vi.fn(),
    onShow: vi.fn(),
    onShowAll: vi.fn(),
    onReset: vi.fn(),
    onDelete: vi.fn(),
  };

  it("should show loading state when isPending is true", () => {
    render(<TimerContextMenuContent {...defaultProps} isPending={true} />);

    expect(screen.getByText("Tworzenie timera...")).toBeDefined();
  });

  it("should render color picker when not pending", () => {
    const { container } = render(<TimerContextMenuContent {...defaultProps} />);

    const colorPicker = container.querySelector(".ll\\:flex.ll\\:gap-1");
    expect(colorPicker).toBeDefined();
  });

  it("should show 'Przypnij' when timer is not pinned", () => {
    render(<TimerContextMenuContent {...defaultProps} isPinned={false} />);

    expect(screen.getByText("Przypnij")).toBeDefined();
  });

  it("should show 'Odepnij' when timer is pinned", () => {
    render(<TimerContextMenuContent {...defaultProps} isPinned={true} />);

    expect(screen.getByText("Odepnij")).toBeDefined();
  });

  it("should call onPin when pin button is clicked", async () => {
    const onPin = vi.fn();
    render(<TimerContextMenuContent {...defaultProps} onPin={onPin} />);

    const pinButton = screen.getByText("Przypnij");
    await userEvent.click(pinButton);

    expect(onPin).toHaveBeenCalledTimes(1);
  });

  it("should show 'Ukryj' when timer is not hidden", () => {
    render(<TimerContextMenuContent {...defaultProps} isHidden={false} />);

    expect(screen.getByText("Ukryj")).toBeDefined();
    expect(screen.getByText("Ukryj na wszystkich serwerach")).toBeDefined();
  });

  it("should show 'Pokaż' when timer is hidden", () => {
    render(<TimerContextMenuContent {...defaultProps} isHidden={true} />);

    expect(screen.getByText("Pokaż")).toBeDefined();
    expect(screen.getByText("Pokaż na wszystkich serwerach")).toBeDefined();
  });

  it("should call onHide when hide button is clicked", async () => {
    const onHide = vi.fn();
    render(
      <TimerContextMenuContent
        {...defaultProps}
        isHidden={false}
        onHide={onHide}
      />,
    );

    const hideButton = screen.getByText("Ukryj");
    await userEvent.click(hideButton);

    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it("should call onShow when show button is clicked", async () => {
    const onShow = vi.fn();
    render(
      <TimerContextMenuContent
        {...defaultProps}
        isHidden={true}
        onShow={onShow}
      />,
    );

    const showButton = screen.getByText("Pokaż");
    await userEvent.click(showButton);

    expect(onShow).toHaveBeenCalledTimes(1);
  });

  it("should call onHideAll when hide all button is clicked", async () => {
    const onHideAll = vi.fn();
    render(
      <TimerContextMenuContent
        {...defaultProps}
        isHidden={false}
        onHideAll={onHideAll}
      />,
    );

    const hideAllButton = screen.getByText("Ukryj na wszystkich serwerach");
    await userEvent.click(hideAllButton);

    expect(onHideAll).toHaveBeenCalledTimes(1);
  });

  it("should call onShowAll when show all button is clicked", async () => {
    const onShowAll = vi.fn();
    render(
      <TimerContextMenuContent
        {...defaultProps}
        isHidden={true}
        onShowAll={onShowAll}
      />,
    );

    const showAllButton = screen.getByText("Pokaż na wszystkich serwerach");
    await userEvent.click(showAllButton);

    expect(onShowAll).toHaveBeenCalledTimes(1);
  });

  it("should call onReset when reset button is clicked", async () => {
    const onReset = vi.fn();
    render(<TimerContextMenuContent {...defaultProps} onReset={onReset} />);

    const resetButton = screen.getByText("Odliczaj od początku");
    await userEvent.click(resetButton);

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("should show delete button when canDelete is true and timersGrouping is false", () => {
    render(
      <TimerContextMenuContent
        {...defaultProps}
        canDelete={true}
        timersGrouping={false}
      />,
    );

    expect(screen.getByText("Usuń timer")).toBeDefined();
  });

  it("should not show delete button when canDelete is false and timersGrouping is false", () => {
    render(
      <TimerContextMenuContent
        {...defaultProps}
        canDelete={false}
        timersGrouping={false}
      />,
    );

    expect(screen.queryByText("Usuń timer")).toBeNull();
  });

  it("should show DeleteTimerPopover when timersGrouping is true", () => {
    const { container } = render(
      <TimerContextMenuContent {...defaultProps} timersGrouping={true} />,
    );

    expect(
      container.querySelector("[data-radix-popper-content-wrapper]"),
    ).toBeDefined();
  });

  it("should show pin for all servers option", () => {
    render(<TimerContextMenuContent {...defaultProps} />);

    expect(screen.getByText("Przypnij na wszystkich serwerach")).toBeDefined();
  });

  it("should show unpin for all servers when timer is pinned", () => {
    render(<TimerContextMenuContent {...defaultProps} isPinned={true} />);

    expect(screen.getByText("Odepnij na wszystkich serwerach")).toBeDefined();
  });

  it("should call onPinAll when pin all button is clicked", async () => {
    const onPinAll = vi.fn();
    render(<TimerContextMenuContent {...defaultProps} onPinAll={onPinAll} />);

    const pinAllButton = screen.getByText("Przypnij na wszystkich serwerach");
    await userEvent.click(pinAllButton);

    expect(onPinAll).toHaveBeenCalledTimes(1);
  });

  it("should call onUnpinAll when unpin all button is clicked for pinned timer", async () => {
    const onUnpinAll = vi.fn();
    render(
      <TimerContextMenuContent
        {...defaultProps}
        isPinned={true}
        onUnpinAll={onUnpinAll}
      />,
    );

    const unpinAllButton = screen.getByText("Odepnij na wszystkich serwerach");
    await userEvent.click(unpinAllButton);

    expect(onUnpinAll).toHaveBeenCalledTimes(1);
  });

  it("should show hide on all servers option", () => {
    render(<TimerContextMenuContent {...defaultProps} />);

    expect(screen.getByText("Ukryj na wszystkich serwerach")).toBeDefined();
  });

  it("should have disabled sound option", () => {
    render(<TimerContextMenuContent {...defaultProps} />);

    const soundButton = screen.getByText("Włącz dźwięk");
    expect(soundButton.closest("[data-disabled]")).toBeDefined();
  });
});
