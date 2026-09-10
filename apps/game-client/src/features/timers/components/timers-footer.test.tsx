import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { createTimerHttpFixture } from "../timer-http-fixtures";
import { TimersFooter } from "./timers-footer";

it("shows color totals, disconnected status and the add action with history only outside grouping", async () => {
  const user = userEvent.setup();
  const fixture = createTimerHttpFixture();
  const onAddTimer = vi.fn<() => void>();

  const footer = (isGrouping: boolean) => (
    <QueryClientProvider client={fixture.queryClient}>
      <TimersFooter
        colorStatistics={[{ color: "red", total: 2, active: 1, name: "Red" }]}
        guildId="guild-1"
        world="pandora"
        isGrouping={isGrouping}
        onAddTimer={onAddTimer}
      />
    </QueryClientProvider>
  );

  const view = render(footer(false));

  try {
    expect(
      screen.getByRole("button", { name: "Historia timerów" }),
    ).toBeVisible();
    await user.hover(
      screen.getByRole("button", { name: "Statystyki kolorów timerów" }),
    );
    expect(await screen.findByText("Red: 1/2")).toBeVisible();
    await user.hover(
      screen.getByRole("button", { name: "Nie połączono z żadnym serwerem" }),
    );
    expect(
      await screen.findByText("Nie połączono z żadnym serwerem"),
    ).toBeVisible();
    await user.hover(screen.getByRole("button", { name: "+" }));
    expect(await screen.findByText("Dodaj timer")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "+" }));
    expect(onAddTimer).toHaveBeenCalledOnce();
    view.rerender(footer(true));
    expect(
      screen.queryByRole("button", { name: "Historia timerów" }),
    ).not.toBeInTheDocument();
  } finally {
    view.unmount();
    fixture.cleanup();
  }
});
