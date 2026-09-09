import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { expect, it, onTestFinished } from "vitest";
import { useWindowsStore } from "@/store/windows.store";
import { createAddTimerFixture } from "./add-timer-fixtures";
import { AddTimer } from "./add-timer";

it("renders the real add form with its window's guild and closes through the window store", async () => {
  const user = userEvent.setup();
  const fixture = createAddTimerFixture();
  useWindowsStore.getState().setOpen("add-timer", true, { guildId: "guild-1" });
  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <AddTimer />
    </QueryClientProvider>,
  );
  onTestFinished(() => {
    view.unmount();
    fixture.cleanup();
  });
  expect(screen.getByText("Dodaj timer")).toBeVisible();
  expect(screen.getByLabelText("Nazwa")).toBeVisible();
  expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await user.click(screen.getByRole("button", { name: "Zamknij okno" }));
  expect(useWindowsStore.getState()["add-timer"].open).toBe(false);
  const windowElement = screen
    .getByText("Dodaj timer")
    .closest("[data-window-id]");
  if (windowElement) fireEvent.animationEnd(windowElement);
  await waitFor(() =>
    expect(screen.queryByLabelText("Nazwa")).not.toBeInTheDocument(),
  );
});
