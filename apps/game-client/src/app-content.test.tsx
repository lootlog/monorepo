import { createNotificationsResponse } from "@/test/game-account-preferences-fixtures";
import {
  accountPreferenceValues,
  createSettingsDocuments,
  seedSettingsDocuments,
} from "@/test/settings-documents-fixtures";
import { useSettingsSaveStatusStore } from "@/features/settings/persistence/settings-save-status.store";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { UserGameAccountPreferencesResponseDtoOutput } from "@lootlog/client/main";
import { createNativeRuntime } from "@/test/native-runtime";
import { createRealtimeTest } from "@/test/realtime-test";
import { createDetectorSettings } from "@/lib/game-account-preferences";
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
    notifications: createNotificationsResponse(),
    detector: createDetectorSettings(),
    pings: { enabled: true },
    airTags: { enabled: false },
    hasStoredNotifications: true,
    hasStoredDetector: true,
    hasStoredPings: true,
    hasStoredAirTags: true,
    hasStoredPreferences: true,
  };

  useWindowsStore.getState().setOpen("quick-access", true);
  const canvas = document.createElement("canvas");
  canvas.id = "GAME_CANVAS";
  canvas.width = 640;
  canvas.height = 640;
  document.body.append(canvas);
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 640, 640),
  );
  // The documents key follows the character that joins below.
  seedSettingsDocuments(
    test.queryClient,
    createSettingsDocuments(accountPreferenceValues(preferences)),
    { gameAccountId: "202", characterId: "101" },
  );
  const view = render(<AppContent />, { wrapper: test.wrapper });
  test.open();
  await test.join();
  // Settings hydration imports browser-only settings on first start; wait for
  // that write to settle so a cache refresh does not interrupt the press.
  await waitFor(() =>
    expect(useSettingsSaveStatusStore.getState().status).not.toBe("saving"),
  );
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
