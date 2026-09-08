import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  getUsersControllerGetUserGameAccountPreferencesQueryKey,
  type UserGameAccountPreferencesResponseDtoOutput,
} from "@lootlog/client/main";
import { createNativeRuntime } from "@/test/native-runtime";
import { createRealtimeTest } from "@/test/realtime-test";
import {
  createNotificationsSettings,
  createDetectorSettings,
} from "@/lib/game-account-preferences";
import { useWindowsStore } from "@/store/windows.store";
import { mapPingInteractionController } from "@/features/map-pings/map-ping-interaction-controller";

vi.stubGlobal("Engine", createNativeRuntime());
const { AppContent } = await import("./app-content");
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("opens the map ping wheel from the configured hotkey and cancels it on Escape", async () => {
  const test = createRealtimeTest();
  const native = createNativeRuntime();
  vi.stubGlobal("Engine", {
    ...native,
    apiData: { CALL_DRAW_ADD_TO_RENDERER: "call_draw_add_to_renderer" },
    map: { ...native.map, offset: [0, 0], size: { x: 100, y: 100 } },
  });
  const preferences: UserGameAccountPreferencesResponseDtoOutput = {
    accountId: "202",
    notifications: createNotificationsSettings(),
    detector: createDetectorSettings(),
    pings: { enabled: true },
    airTags: { enabled: false },
    hasStoredNotifications: true,
    hasStoredDetector: true,
    hasStoredPings: true,
    hasStoredAirTags: true,
    hasStoredPreferences: true,
  };
  test.queryClient.setQueryData(
    getUsersControllerGetUserGameAccountPreferencesQueryKey({
      accountId: "202",
    }),
    preferences,
  );
  useWindowsStore.getState().setOpen("quick-access", true);
  const canvas = document.createElement("canvas");
  canvas.id = "GAME_CANVAS";
  canvas.width = 640;
  canvas.height = 640;
  document.body.append(canvas);
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 640, 640),
  );
  const view = render(<AppContent />, { wrapper: test.wrapper });
  test.open();
  await test.join();
  fireEvent.mouseDown(canvas, { button: 1, clientX: 400, clientY: 272 });
  await waitFor(() =>
    expect(mapPingInteractionController.getSnapshot()).not.toBeNull(),
  );
  expect(screen.getByRole("status", { name: /ping/i })).toBeInTheDocument();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(mapPingInteractionController.getSnapshot()).toBeNull();
  expect(screen.queryByRole("status", { name: /ping/i })).toBeNull();
  act(() => view.unmount());
  canvas.remove();
});
