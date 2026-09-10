import { createTimerRealtimeFixture } from "../timer-realtime-fixtures";
import { createTimerGuildFixture } from "../timer-fixtures";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { getUsersControllerGetCurrentUserAccessibleGuildsQueryKey } from "@lootlog/client/main";
import { expect, it } from "vitest";
import { SocketProvider } from "@/contexts/socket-context";
import { getSocket } from "@/lib/socket";
import { createTimerHttpFixture } from "../timer-http-fixtures";
import { TimersConnectionStatus } from "./timers-connection-status";

it("shows joined guild names from the real gateway and clears them on disconnect", async () => {
  const user = userEvent.setup();
  const fixture = createTimerHttpFixture();

  const guilds = [
    createTimerGuildFixture(),
    createTimerGuildFixture({ id: "guild-2", name: "Beta" }),
  ];

  fixture.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    guilds,
  );
  const gateway = createTimerRealtimeFixture();

  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <SocketProvider>
        <TimersConnectionStatus />
      </SocketProvider>
    </QueryClientProvider>,
  );

  try {
    const disconnected = screen.getByRole("button", {
      name: "Nie połączono z żadnym serwerem",
    });

    expect(disconnected).toHaveClass("ll:bg-red-400");
    await user.hover(disconnected);
    expect(
      await screen.findByText("Nie połączono z żadnym serwerem"),
    ).toBeVisible();
    act(() => gateway.wire.open());
    await gateway.join(["guild-2", "guild-1"]);

    const connected = screen.getByRole("button", {
      name: "Połączono z serwerami:",
    });

    expect(connected).toHaveClass("ll:bg-green-400");
    await user.unhover(connected);
    await user.hover(connected);
    expect(await screen.findByText("Beta")).toBeVisible();
    expect(screen.getByText("Alpha")).toBeVisible();
    act(() => getSocket().disconnect());
    expect(
      screen.getByRole("button", { name: "Nie połączono z żadnym serwerem" }),
    ).toHaveClass("ll:bg-red-400");
  } finally {
    view.unmount();
    gateway.cleanup();
    fixture.cleanup();
  }
});
