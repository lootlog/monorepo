import "@/index.css";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { createTimerFixture } from "@/features/timers/model/timer-fixtures";
import { createTimerViewFixture } from "@/features/timers/model/timer-view-fixtures";
import { TimersUnderBag } from "./timers-under-bag";

afterEach(() => {
  document.body.className = "";
});

it("renders the timers into the bag column with the host theme and stops wheel propagation", () => {
  const fixture = createTimerViewFixture([
    createTimerFixture({
      world: "gefion",
      minSpawnTime: "2099-04-22T10:00:00.000Z",
      maxSpawnTime: "2099-04-22T10:05:00.000Z",
    }),
  ]);

  const lootlogRoot = document.createElement("div");
  lootlogRoot.id = "lootlog-root";
  lootlogRoot.className = "dark-theme";
  document.body.append(lootlogRoot);
  const wheelListener = vi.fn<(event: Event) => void>();
  fixture.gameColumn
    .querySelector(".right-main-column-wrapper")
    ?.addEventListener("wheel", wheelListener);

  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <TimersUnderBag />
    </QueryClientProvider>,
    { container: lootlogRoot },
  );

  onTestFinished(() => {
    view.unmount();
    fixture.cleanup();
    lootlogRoot.remove();
  });

  const tile = screen.getByText(/Tanroth/);
  expect(fixture.gameColumn.contains(tile)).toBe(true);
  const portal = fixture.gameColumn.querySelector(".bottom-wrapper > div");
  expect(portal).toHaveClass("ll-theme-boundary", "dark-theme");
  fireEvent.wheel(tile);
  expect(wheelListener).not.toHaveBeenCalled();
});
