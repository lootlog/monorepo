import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SocketProvider } from "@/contexts/socket-context";
import { createTimerRealtimeFixture } from "@/features/timers/timer-realtime-fixtures";
import { ConnectionStatusStrip } from "./connection-status-strip";

const CONNECTING = "Łączenie z serwerem…";

const RECONNECTING = "Połączenie przerwane, ponowne łączenie…";

const mountStrip = ({ error = false, refreshing = false } = {}) => {
  vi.useFakeTimers();
  const gateway = createTimerRealtimeFixture();

  const view = render(
    <SocketProvider>
      <ConnectionStatusStrip
        hasData
        error={error}
        errorLabel="Nie udało się odświeżyć"
        refreshing={refreshing}
        refreshingLabel="Odświeżanie"
      />
    </SocketProvider>,
  );

  return {
    gateway,
    cleanup: () => {
      view.unmount();
      gateway.cleanup();
    },
  };
};

/** Advances time, then lets the strip mount a notice that became due. */
const advance = (ms: number) => {
  act(() => vi.advanceTimersByTime(ms));
  act(() => vi.advanceTimersByTime(0));
};

afterEach(() => {
  vi.useRealTimers();
});

it("never flashes a status while the first connection completes quickly", async () => {
  const { gateway, cleanup } = mountStrip();

  try {
    advance(1000);
    act(() => gateway.wire.open());
    await gateway.join(["guild-1"]);
    advance(5000);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  } finally {
    cleanup();
  }
});

it("reports a slow first connection as connecting, not as a lost connection", () => {
  const { cleanup } = mountStrip();

  try {
    advance(1500);

    expect(screen.getByRole("status")).toHaveTextContent(CONNECTING);
    expect(screen.queryByText(RECONNECTING)).not.toBeInTheDocument();
  } finally {
    cleanup();
  }
});

it("reports a dropped session as reconnecting once the drop lasts", async () => {
  const { gateway, cleanup } = mountStrip();

  try {
    act(() => gateway.wire.open());
    await gateway.join(["guild-1"]);
    act(() => gateway.wire.close());
    advance(999);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    advance(1);

    expect(screen.getByRole("status")).toHaveTextContent(RECONNECTING);
  } finally {
    cleanup();
  }
});

it("shows a refresh error at once, ahead of the connection state", () => {
  const { cleanup } = mountStrip({ error: true });

  try {
    advance(1500);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Nie udało się odświeżyć",
    );
    expect(screen.queryByText(CONNECTING)).not.toBeInTheDocument();
  } finally {
    cleanup();
  }
});

it("waits out the drop delay even when another notice is already on screen", async () => {
  const { gateway, cleanup } = mountStrip({ refreshing: true });

  try {
    act(() => gateway.wire.open());
    await gateway.join(["guild-1"]);
    advance(200);

    expect(screen.getByRole("status")).toHaveTextContent("Odświeżanie");

    act(() => gateway.wire.close());
    advance(999);

    expect(screen.getByRole("status")).toHaveTextContent("Odświeżanie");

    advance(1);

    expect(screen.getByRole("status")).toHaveTextContent(RECONNECTING);
  } finally {
    cleanup();
  }
});
