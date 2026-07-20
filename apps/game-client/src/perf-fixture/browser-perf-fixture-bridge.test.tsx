import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNotificationsStore } from "@/store/notifications.store";
import { useWindowsStore } from "@/store/windows.store";
import { BrowserPerfFixtureBridge } from "./browser-perf-fixture-bridge";
import type { NotificationPresentationRequest } from "@/features/notifications/hooks/use-notification-presenter";

vi.mock("@/features/notifications/hooks/use-notification-presenter", () => ({
  useNotificationPresenter: () => ({
    presentNotifications: (requests: NotificationPresentationRequest[]) => {
      useNotificationsStore
        .getState()
        .presentNotifications(
          requests.map(({ notification }) => ({ notification })),
        );
      useWindowsStore.getState().setOpen("notifications", true);
    },
  }),
}));

describe("BrowserPerfFixtureBridge", () => {
  beforeEach(() => {
    useNotificationsStore.setState({
      notifications: [],
      notificationAutoHideByListKey: {},
      latestNotificationAnimationCycle: 0,
    });
    window.__lootlogPerfInstrumentation = {
      audioInstances: 2,
      audioPlays: 3,
      bodyObserverCallbacks: 0,
      longAnimationFrames: [],
      longTasks: [],
      mutationObserverCallbacks: 4,
      reactCommits: 0,
      storageWrites: 5,
    };
  });

  it("reports one atomic store publication and the committed notification", async () => {
    render(<BrowserPerfFixtureBridge />);

    await waitFor(() => {
      expect(window.__lootlogBrowserPerf).toBeDefined();
    });

    const fixtureApi = window.__lootlogBrowserPerf;
    if (!fixtureApi) {
      throw new Error("Browser performance fixture API was not installed");
    }
    const measurement = await act(() =>
      fixtureApi.present({
        count: 1,
        idPrefix: "single",
        playSound: false,
      }),
    );

    expect(measurement.storePublications).toBe(1);
    expect(measurement.storeNotificationCount).toBe(1);
    expect(measurement.notificationIds).toEqual(["single-0"]);
    expect(measurement.receiveToStoreMs).toBeGreaterThanOrEqual(0);
    expect(measurement.receiveToPaintMs).toBeGreaterThanOrEqual(
      measurement.receiveToStoreMs,
    );
    expect(measurement.receiveToDoubleAnimationFrameMs).toBeGreaterThanOrEqual(
      measurement.receiveToPaintMs,
    );
  });

  it("resets notifications and exposes cumulative browser instrumentation", async () => {
    render(<BrowserPerfFixtureBridge />);

    await waitFor(() => {
      expect(window.__lootlogBrowserPerf).toBeDefined();
    });

    const fixtureApi = window.__lootlogBrowserPerf;
    if (!fixtureApi) {
      throw new Error("Browser performance fixture API was not installed");
    }
    await act(() =>
      fixtureApi.present({
        count: 2,
        idPrefix: "reset",
        playSound: false,
      }),
    );
    await act(() => fixtureApi.reset());

    expect(useNotificationsStore.getState().notifications).toHaveLength(0);
    expect(fixtureApi.snapshot()).toMatchObject({
      audioInstances: 2,
      audioPlays: 3,
      mutationObserverCallbacks: 4,
      storageWrites: 5,
      storeNotificationCount: 0,
    });
  });
});
