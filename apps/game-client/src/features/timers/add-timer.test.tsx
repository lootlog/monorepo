import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetOpen = vi.fn();
const addTimerFormSpy = vi.fn();

let addTimerOpen = true;
let addTimerGuildId: string | undefined = "guild-1";

vi.mock("@/store/windows.store", () => ({
  useWindowsStore: (
    selector: (state: {
      "add-timer": { open: boolean; state: { guildId?: string } };
      setOpen: typeof mockSetOpen;
    }) => unknown,
  ) =>
    selector({
      "add-timer": { open: addTimerOpen, state: { guildId: addTimerGuildId } },
      setOpen: mockSetOpen,
    }),
}));

vi.mock("@/components/draggable-window", () => ({
  DraggableWindow: ({
    children,
    isOpen,
    title,
    onClose,
  }: {
    children: ReactNode;
    isOpen: boolean;
    title: string;
    onClose?: () => void;
  }) => (
    <section data-testid="draggable-window" data-open={String(isOpen)}>
      <h1>{title}</h1>
      <button type="button" onClick={onClose}>
        close
      </button>
      {children}
    </section>
  ),
}));

vi.mock("@/features/timers/components/add-timer-form", () => ({
  AddTimerForm: (props: unknown) => {
    addTimerFormSpy(props);
    return <div>AddTimerForm</div>;
  },
}));

import { AddTimer } from "./add-timer";

describe("AddTimer", () => {
  beforeEach(() => {
    addTimerOpen = true;
    addTimerGuildId = "guild-1";
    mockSetOpen.mockReset();
    addTimerFormSpy.mockReset();
  });

  it("renders the add timer window and closes it through the window store", async () => {
    const user = userEvent.setup();

    render(<AddTimer />);

    expect(screen.getByTestId("draggable-window")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Dodaj timer" })).toBeVisible();
    expect(screen.getByText("AddTimerForm")).toBeVisible();
    expect(addTimerFormSpy).toHaveBeenCalledWith({
      initialGuildId: "guild-1",
    });

    await user.click(screen.getByRole("button", { name: "close" }));

    expect(mockSetOpen).toHaveBeenCalledWith("add-timer", false);
  });
});
