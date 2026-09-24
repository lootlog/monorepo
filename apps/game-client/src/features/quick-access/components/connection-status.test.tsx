import { createTimerRealtimeFixture } from "@/features/timers/timer-realtime-fixtures";
import { createTimerGuildFixture } from "@/features/timers/timer-fixtures";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { getUsersControllerGetCurrentUserAccessibleGuildsQueryKey } from "@lootlog/client/main";
import { expect, it, vi } from "vitest";
import { useGameStore } from "@/store/game.store";
import { GatewayEvent } from "@/config/gateway";
import { SocketProvider } from "@/contexts/socket-context";
import { getSocket } from "@/lib/socket";
import { createTimerHttpFixture } from "@/features/timers/timer-http-fixtures";
import { ConnectionStatus } from "./connection-status";

it("shows connecting, then memberships and heartbeat latency, and a dropped connection as reconnecting", async () => {
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
  const previousGameState = useGameStore.getState();

  const view = render(
    <QueryClientProvider client={fixture.queryClient}>
      <SocketProvider>
        <ConnectionStatus />
      </SocketProvider>
    </QueryClientProvider>,
  );

  try {
    const connecting = screen.getByRole("button", {
      name: "Łączenie z serwerem…",
    });

    await user.hover(connecting);
    expect(await screen.findByText("Łączenie z serwerem…")).toBeVisible();
    act(() => gateway.wire.open());
    await gateway.join(["guild-2", "guild-1"]);

    const connected = screen.getByRole("button", {
      name: "Połączono z serwerem",
    });

    await user.unhover(connected);
    await user.hover(connected);
    expect(await screen.findByText("Beta")).toBeVisible();
    expect(screen.getByText("Alpha")).toBeVisible();
    vi.useFakeTimers();
    let now = 1_000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "2",
        characterId: "1",
        currentHp: 100,
        icon: "hero.gif",
        level: 100,
        maxHp: 100,
        name: "Hero",
        profession: "w",
        x: 1,
        y: 2,
      },
      interface: "ni",
      map: { id: 100, name: "Karka-han", visibility: 0 },
      world: "luvia",
    });
    getSocket().emit(GatewayEvent.PLAYER_PRESENCE_UPDATE, { isAfk: false });
    const publication = gateway.wire.frames.at(-1);

    if (
      !publication ||
      !("type" in publication) ||
      publication.type !== "presence.publish" ||
      !publication.requestId
    )
      throw new Error("Expected presence publication");
    const publicationRequestId = publication.requestId;
    await act(async () => {
      gateway.wire.receive({
        v: 1,
        requestId: publicationRequestId,
        status: "success",
        data: { sessionId: "presence-session" },
      });
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(25_000);
    });
    const heartbeat = gateway.wire.frames.at(-1);

    if (
      !heartbeat ||
      !("type" in heartbeat) ||
      heartbeat.type !== "presence.heartbeat" ||
      !heartbeat.requestId
    )
      throw new Error("Expected automatic heartbeat");
    const heartbeatRequestId = heartbeat.requestId;
    now += 42;
    await act(async () => {
      gateway.wire.receive({
        v: 1,
        requestId: heartbeatRequestId,
        status: "success",
        data: {},
      });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(
      screen.getByRole("button", { name: /Ping heartbeat: 42 ms/ }),
    ).toBeVisible();
    expect(screen.getByText("42 ms")).toBeVisible();
    act(() => getSocket().disconnect());
    expect(screen.queryByText("42 ms")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Połączenie przerwane, ponowne łączenie…",
      }),
    ).toBeInTheDocument();
  } finally {
    view.unmount();
    gateway.cleanup();
    fixture.cleanup();
    useGameStore.setState(previousGameState);
    vi.restoreAllMocks();
    vi.useRealTimers();
  }
});
