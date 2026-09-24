import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SocketProvider } from "@/contexts/socket-context";
import { createTimerRealtimeFixture } from "@/features/timers/timer-realtime-fixtures";
import { ConnectionStatusStrip } from "./connection-status-strip";

const CONNECTING = "Łączenie z serwerem…";

const RECONNECTING = "Połączenie przerwane, ponowne łączenie…";

const mountStrip = ({ error = false } = {}) => {
  vi.useFakeTimers();
  const gateway = createTimerRealtimeFixture();

  const view = render(
    <SocketProvider>
      <ConnectionStatusStrip
        hasData
        error={error}
        errorLabel="Nie udało się odświeżyć"
        refreshing={false}
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

afterEach(() => {
  vi.useRealTimers();
});

it("never flashes a status while the first connection completes quickly", async () => {
  const { gateway, cleanup } = mountStrip();

  try {
    act(() => vi.advanceTimersByTime(1000));
    act(() => gateway.wire.open());
    await gateway.join(["guild-1"]);
    act(() => vi.advanceTimersByTime(5000));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  } finally {
    cleanup();
  }
});

it("reports a slow first connection as connecting, not as a lost connection", () => {
  const { cleanup } = mountStrip();

  try {
    act(() => vi.advanceTimersByTime(1500));

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
    act(() => vi.advanceTimersByTime(999));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));

    expect(screen.getByRole("status")).toHaveTextContent(RECONNECTING);
  } finally {
    cleanup();
  }
});

it("shows a refresh error at once, ahead of the connection state", () => {
  const { cleanup } = mountStrip({ error: true });

  try {
    act(() => vi.advanceTimersByTime(0));
    act(() => vi.advanceTimersByTime(1500));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Nie udało się odświeżyć",
    );
    expect(screen.queryByText(CONNECTING)).not.toBeInTheDocument();
  } finally {
    cleanup();
  }
});
