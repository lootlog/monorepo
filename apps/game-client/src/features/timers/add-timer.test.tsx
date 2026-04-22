import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetOpen = vi.fn();

let addTimerOpen = true;

vi.mock("@/store/windows.store", () => ({
  useWindowsStore: (
    selector: (state: {
      "add-timer": { open: boolean };
      setOpen: typeof mockSetOpen;
    }) => unknown,
  ) =>
    selector({
      "add-timer": { open: addTimerOpen },
      setOpen: mockSetOpen,
    }),
}));

vi.mock("@/components/animated-window", () => ({
  AnimatedWindow: ({
    children,
    isOpen,
  }: {
    children: ReactNode;
    isOpen: boolean;
  }) => (
    <div data-testid="animated-window" data-open={String(isOpen)}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/draggable-window", () => ({
  DraggableWindow: ({
    children,
    title,
    onClose,
  }: {
    children: ReactNode;
    title: string;
    onClose?: () => void;
  }) => (
    <section>
      <h1>{title}</h1>
      <button type="button" onClick={onClose}>
        close
      </button>
      {children}
    </section>
  ),
}));

vi.mock("@/features/timers/components/add-timer-form", () => ({
  AddTimerForm: () => <div>AddTimerForm</div>,
}));

import { AddTimer } from "./add-timer";

describe("AddTimer", () => {
  beforeEach(() => {
    addTimerOpen = true;
    mockSetOpen.mockReset();
  });

  it("renders the add timer window and closes it through the window store", async () => {
    const user = userEvent.setup();

    render(<AddTimer />);

    expect(screen.getByTestId("animated-window")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Dodaj timer" })).toBeVisible();
    expect(screen.getByText("AddTimerForm")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "close" }));

    expect(mockSetOpen).toHaveBeenCalledWith("add-timer", false);
  });
});
