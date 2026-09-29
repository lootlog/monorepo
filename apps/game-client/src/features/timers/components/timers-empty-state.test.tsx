import { render as renderUi, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { TimersEmptyState } from "./timers-empty-state";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const render = (ui: ReactElement) => renderUi(ui, { wrapper: harness.wrapper });

describe("TimersEmptyState", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
  });

  it("shows a dedicated message and reset action for active filters", async () => {
    const user = userEvent.setup();
    const onResetFilters = vi.fn<() => void>();
    render(
      <TimersEmptyState areFiltersActive onResetFilters={onResetFilters} />,
    );

    expect(screen.getByText("Żaden timer nie pasuje do filtrów")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Pokaż wszystkie" }));
    expect(onResetFilters).toHaveBeenCalledOnce();
  });

  it("shows the generic empty message when no filters are active", () => {
    render(
      <TimersEmptyState
        areFiltersActive={false}
        onResetFilters={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByText("Nie ma jeszcze timerów")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("explains how to join instead of waiting for timers when the player has no Lootlog", () => {
    harness.queryClient.setQueryData(harness.guildsKey, []);

    render(
      <TimersEmptyState
        areFiltersActive={false}
        onResetFilters={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByText("Nie należysz do żadnego Lootloga")).toBeVisible();
    expect(
      screen.queryByText("Nie ma jeszcze timerów"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Otwórz stronę Lootloga" }),
    ).toBeVisible();
  });
});
