import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { expect, it } from "vitest";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { queryKeys } from "@/features/public-api/query-keys";
import { createTimerHttpFixture } from "../timer-http-fixtures";
import { createTimerFixture } from "../timer-fixtures";
import { TimerHistoryPopover } from "./timer-history-popover";

it.each([
  { action: "DELETE", label: "Przywróć timer" },
  { action: "RESET", label: "Cofnij odświeżenie" },
] as const)(
  "retries a timer's history from its context menu and restores the selected $action entry",
  async ({ action, label }) => {
    const user = userEvent.setup();
    let failed = false;

    const fixture = createTimerHttpFixture((request) => {
      if (request.method === "POST") return Response.json(fixture.restored);

      if (!failed) {
        failed = true;

        return Response.json({ message: "Failed" }, { status: 500 });
      }

      return Response.json([fixture.history]);
    });

    fixture.history.action = action;

    const timer = {
      ...createTimerFixture({ timerKey: fixture.history.timerKey }),
      minTimeLeft: 0,
      maxTimeLeft: 0,
    };

    const view = render(
      <QueryClientProvider client={fixture.queryClient}>
        <ContextMenu>
          <ContextMenuTrigger>Timer</ContextMenuTrigger>
          <ContextMenuContent>
            <TimerHistoryPopover timer={timer} />
          </ContextMenuContent>
        </ContextMenu>
      </QueryClientProvider>,
    );

    try {
      expect(fixture.requests).toHaveLength(0);
      await user.pointer({
        keys: "[MouseRight]",
        target: screen.getByText("Timer"),
      });
      await user.click(
        await screen.findByRole("menuitem", { name: "Historia" }),
      );
      await user.click(
        await screen.findByRole("button", { name: "Spróbuj ponownie" }),
      );
      expect(await screen.findByText("Salvatore (Lootlog)")).toBeVisible();
      const url = new URL(fixture.requests[0].url);
      expect(decodeURIComponent(url.pathname)).toBe(
        "/guilds/guild-1/timers/123:tanroth/history",
      );
      expect(Object.fromEntries(url.searchParams)).toEqual({
        world: "luvia",
        limit: "5",
      });
      await user.hover(screen.getByText("Salvatore (Lootlog)"));
      expect(await screen.findByText("Zorin (300b)")).toBeVisible();
      await user.click(screen.getByRole("button", { name: label }));
      await waitFor(() =>
        expect(
          fixture.queryClient.getQueryData(queryKeys.timers("luvia")),
        ).toEqual([
          expect.objectContaining({
            timerKey: fixture.history.timerKey,
            isPending: false,
          }),
        ]),
      );
      expect(new URL(fixture.requests[2].url).pathname).toBe(
        "/guilds/guild-1/timers/history/1/restore",
      );
    } finally {
      view.unmount();
      fixture.cleanup();
    }
  },
);
