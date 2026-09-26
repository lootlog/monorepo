import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { queryKeys } from "@/features/public-api/query-keys";
import { createTimerHttpFixture } from "../timer-http-fixtures";
import { GlobalTimerHistoryPopover } from "./global-timer-history-popover";
import { SocketProvider } from "@/contexts/socket-context";
import { useTimersSocket } from "../hooks/use-timers-socket";
import { createTimerRealtimeFixture } from "../timer-realtime-fixtures";
import { createTimerHistoryFixture } from "../timer-fixtures";

function HistoryWithRealtime() {
  useTimersSocket();

  return <GlobalTimerHistoryPopover guildId="guild-1" world="luvia" />;
}

it("loads scoped history only when opened and restores the timer into its world cache", async () => {
  const user = userEvent.setup();
  const fixture = createTimerHttpFixture();

  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <GlobalTimerHistoryPopover guildId="guild-1" world="luvia" />
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
      world: "luvia",
      limit: "10",
    });
    await user.hover(screen.getByText("Tanroth"));
    expect(await screen.findByText("Zorin (300b)")).toBeVisible();
    expect(screen.getByText("12:01:02")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Przywróć timer" }));
    await waitFor(() =>
      expect(
        fixture.queryClient.getQueryData(queryKeys.timers("luvia")),
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

it("reloads a recently closed history after a deletion and stops offering restore once the timer is active", async () => {
  const user = userEvent.setup();

  let history = createTimerHistoryFixture({
    action: "CREATE",
    canRestore: false,
  });

  const fixture = createTimerHttpFixture((request) => {
    if (request.method === "POST") {
      history = { ...history, canRestore: false };

      return Response.json(fixture.restored);
    }

    return Response.json([history]);
  });

  fixture.queryClient.setQueryDefaults(["/timers/history"], {
    staleTime: 30_000,
  });
  const gateway = createTimerRealtimeFixture();

  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <SocketProvider>
        <HistoryWithRealtime />
      </SocketProvider>
    </QueryClientProvider>,
  );

  try {
    act(() => gateway.wire.open());
    await gateway.join(["guild-1"]);
    await user.click(screen.getByRole("button", { name: "Historia timerów" }));
    expect(await screen.findByText("Salvatore (Lootlog)")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Przywróć timer" })).toBeNull();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByText("Salvatore (Lootlog)")).toBeNull(),
    );

    history = createTimerHistoryFixture();
    await gateway.receive({
      v: 1,
      type: "timer.deleted",
      data: {
        organizationId: history.guildId,
        payload: {
          guildId: history.guildId,
          world: history.world,
          timerKey: history.timerKey,
        },
      },
    });
    expect(fixture.requests).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Historia timerów" }));
    await user.click(
      await screen.findByRole("button", { name: "Przywróć timer" }),
    );
    await waitFor(() =>
      expect(screen.queryByText("Salvatore (Lootlog)")).toBeNull(),
    );
    expect(
      fixture.queryClient.getQueryData(queryKeys.timers("luvia")),
    ).toMatchObject([
      {
        guildId: history.guildId,
        timerKey: history.timerKey,
        isPending: false,
      },
    ]);
    await user.click(screen.getByRole("button", { name: "Historia timerów" }));
    expect(await screen.findByText("Salvatore (Lootlog)")).toBeVisible();
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Przywróć timer" }),
      ).toBeNull(),
    );
    expect(
      fixture.requests.filter((request) => request.method === "GET").length,
    ).toBeGreaterThanOrEqual(3);
    expect(
      fixture.requests.filter((request) => request.method === "POST"),
    ).toHaveLength(1);
  } finally {
    view.unmount();
    gateway.cleanup();
    fixture.cleanup();
  }
});
