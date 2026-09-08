import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { queryKeys } from "@/features/public-api/query-keys";
import { createTimerHttpFixture } from "../timer-http-fixtures";
import { GlobalTimerHistoryPopover } from "./global-timer-history-popover";

it("loads scoped history only when opened and restores the timer into its world cache", async () => {
  const user = userEvent.setup();
  const fixture = createTimerHttpFixture();
  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <GlobalTimerHistoryPopover guildId="guild-1" world="pandora" />
    </QueryClientProvider>,
  );
  try {
    expect(fixture.requests).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Historia timerów" }));
    expect(await screen.findByText("Salvatore (Lootlog)")).toBeVisible();
    const url = new URL(fixture.requests[0].url);
    expect(url.pathname).toBe("/timers/history");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      guildId: "guild-1",
      world: "pandora",
      limit: "10",
    });
    await user.hover(screen.getByText("Tanroth"));
    expect(await screen.findByText("Zorin (300b)")).toBeVisible();
    expect(screen.getByText("12:01:02")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Przywróć timer" }));
    await waitFor(() =>
      expect(
        fixture.queryClient.getQueryData(queryKeys.timers("pandora")),
      ).toEqual([
        expect.objectContaining({
          timerKey: fixture.history.timerKey,
          guildId: "guild-1",
          isPending: false,
        }),
      ]),
    );
    expect(new URL(fixture.requests[1].url).pathname).toBe(
      "/guilds/guild-1/timers/history/1/restore",
    );
    expect(fixture.requests[1].method).toBe("POST");
  } finally {
    view.unmount();
    fixture.cleanup();
  }
});
