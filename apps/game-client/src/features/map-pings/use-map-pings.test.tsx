import { encodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSoundSettingsControllerGetSettingsQueryKey,
  getUsersControllerGetUserGameAccountPreferencesQueryKey,
  type UserGameAccountPreferencesResponseDtoOutput,
  type SoundSettingsResponseDto,
} from "@lootlog/client/main";
import { createRealtimeTest } from "@/test/realtime-test";
import {
  createNotificationsSettings,
  createDetectorSettings,
} from "@/lib/game-account-preferences";
import { useGlobalStore } from "@/store/global.store";
import { useSettingsStore } from "@/store/settings.store";
import { useGameStore } from "@/store/game.store";
import { disposeSoundPlayback } from "@/lib/sound-playback";
import { useMapPings } from "./use-map-pings";
import { mapPingController } from "./map-ping-controller";
import {
  mapPingInteractionController,
  MAP_PING_HOLD_DELAY_MS,
} from "./map-ping-interaction-controller";

const preferences = (
  enabled: boolean,
): UserGameAccountPreferencesResponseDtoOutput => ({
  accountId: "1",
  notifications: createNotificationsSettings(),
  detector: createDetectorSettings(),
  pings: { enabled },
  airTags: { enabled: true },
  hasStoredNotifications: true,
  hasStoredDetector: true,
  hasStoredPings: true,
  hasStoredAirTags: true,
  hasStoredPreferences: true,
});
const remotePing = () => ({
  v: 1 as const,
  type: "map-ping.received" as const,
  data: {
    pingId: "remote-1",
    world: "pandora",
    mapId: 42,
    type: "attention" as const,
    x: 12,
    y: 8,
    sender: { characterId: "123", name: "Other" },
    createdAt: Date.now(),
  },
});
const setup = async ({
  enabled = true,
  connected = true,
  joined = true,
  oldInterface = false,
} = {}) => {
  const test = createRealtimeTest();
  const preferenceKey = getUsersControllerGetUserGameAccountPreferencesQueryKey(
    { accountId: "1" },
  );
  test.queryClient.setQueryData(preferenceKey, preferences(enabled));
  useGlobalStore.setState({ gameState: { gameInitialized: joined } });
  if (oldInterface) {
    const game = useGameStore.getState().game;
    if (!game) throw new Error("Missing game");
    useGameStore.getState().replaceGame({ ...game, interface: "si" });
  }
  useSettingsStore.setState({ soundsMuted: false, masterVolume: 1 });
  const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  const addDraw = vi.fn<(event: string, callback: () => void) => void>();
  const removeDraw = vi.fn<(event: string, callback: () => void) => void>();
  vi.stubGlobal("API", {
    addCallbackToEvent: addDraw,
    removeCallbackFromEvent: removeDraw,
  });
  vi.stubGlobal("Engine", {
    apiData: { CALL_DRAW_ADD_TO_RENDERER: "call_draw_add_to_renderer" },
    map: { d: { id: 42 }, offset: [0, 0], size: { x: 100, y: 100 } },
  });
  const canvas = document.createElement("canvas");
  canvas.id = "GAME_CANVAS";
  canvas.width = 640;
  canvas.height = 640;
  document.body.append(canvas);
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 640, 640),
  );
  const view = renderHook(() => useMapPings(), { wrapper: test.wrapper });
  if (connected) {
    test.open();
    if (joined) {
      await act(async () => {
        await vi.waitFor(() => {
          if (
            !test.wire.frames.some(
              (frame) => "type" in frame && frame.type === "session.join",
            )
          )
            throw new Error("Waiting for automatic join");
        });
        const request = test.wire.frames.find(
          (frame) => "type" in frame && frame.type === "session.join",
        );
        if (!request || !("requestId" in request) || !request.requestId)
          throw new Error("Missing join request");
        test.wire.receive({
          v: 1,
          requestId: request.requestId,
          status: "success",
          data: { connectionId: "test", organizationIds: ["guild-1"] },
        });
      });
    }
  }
  const sound: SoundSettingsResponseDto = {
    userId: "user",
    masterVolume: 1,
    notificationsVolume: 1,
    detectorVolume: 1,
    timersVolume: 1,
    pingsVolume: 1,
    notificationsConfig: null,
    detectorConfig: null,
    timersConfig: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
  test.queryClient.setQueryData(
    getSoundSettingsControllerGetSettingsQueryKey(),
    sound,
  );
  const event = (outside = false) => {
    const element = outside ? document.createElement("div") : canvas;
    const mouse = new MouseEvent("mousedown", {
      button: 1,
      clientX: 400,
      clientY: 272,
    });
    element.dispatchEvent(mouse);
    return mouse;
  };
  const tap = () => {
    let started = false;
    act(() => {
      started = view.result.current.onMapPingStart(event());
      view.result.current.onMapPingEnd(
        new MouseEvent("mouseup", { button: 1 }),
      );
    });
    return started;
  };
  const pingRequests = () =>
    test.wire.frames.filter(
      (frame) => "type" in frame && frame.type === "map-ping.send",
    );
  const setEnabled = (value: boolean) =>
    test.queryClient.setQueryData(preferenceKey, preferences(value));
  return {
    ...test,
    ...view,
    play,
    addDraw,
    removeDraw,
    event,
    tap,
    pingRequests,
    setEnabled,
    canvas,
  };
};
afterEach(() => {
  mapPingController.unregister();
  mapPingInteractionController.cancel();
  disposeSoundPlayback();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.querySelector("#GAME_CANVAS")?.remove();
});

describe("useMapPings", () => {
  it("plays one immediate local sound and sends the resolved map coordinates", async () => {
    const test = await setup();
    expect(test.tap()).toBe(true);
    expect(test.addDraw).toHaveBeenCalledOnce();
    expect(test.play).toHaveBeenCalledOnce();
    expect(test.play.mock.instances[0]).toMatchObject({
      playbackRate: 1,
      preservesPitch: false,
    });
    expect(test.pingRequests()).toEqual([
      expect.objectContaining({
        data: { expectedMapId: 42, type: "attention", x: 12, y: 8 },
      }),
    ]);
  });
  it("propagates a held contextual selection to sound and gateway", async () => {
    const test = await setup();
    act(() => {
      test.result.current.onMapPingStart(test.event());
    });
    await new Promise<void>((resolve) =>
      setTimeout(resolve, MAP_PING_HOLD_DELAY_MS + 10),
    );
    act(() => {
      test.canvas.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          clientX: 480,
          clientY: 272,
        }),
      );
      test.result.current.onMapPingEnd(
        new MouseEvent("mouseup", { button: 1 }),
      );
    });
    expect(test.pingRequests()).toEqual([
      expect.objectContaining({
        data: { expectedMapId: 42, type: "enemy", x: 12, y: 8 },
      }),
    ]);
    expect(test.play.mock.instances[0]).toMatchObject({
      playbackRate: 1.35,
      preservesPitch: false,
    });
  });
  it("uses the latest cached preference before the query rerenders", async () => {
    const test = await setup({ enabled: false });
    test.setEnabled(true);
    expect(test.tap()).toBe(true);
    expect(test.pingRequests()).toHaveLength(1);
  });
  it("rejects local pings on the old interface", async () => {
    const test = await setup({ oldInterface: true });
    expect(test.tap()).toBe(false);
    expect(test.play).not.toHaveBeenCalled();
    expect(test.addDraw).not.toHaveBeenCalled();
    expect(test.pingRequests()).toHaveLength(0);
  });
  it("installs no map pointer listener while disabled", async () => {
    const addListener = vi.spyOn(window, "addEventListener");
    const test = await setup({ enabled: false });
    expect(addListener.mock.calls.some(([type]) => type === "mousemove")).toBe(
      false,
    );
    expect(test.addDraw).not.toHaveBeenCalled();
  });
  it.each([
    { name: "disabled", options: { enabled: false } },
    { name: "disconnected", options: { connected: false } },
    { name: "not joined", options: { joined: false } },
  ])("stays silent when $name", async ({ options }) => {
    const test = await setup(options);
    expect(test.tap()).toBe(false);
    expect(test.play).not.toHaveBeenCalled();
    expect(test.pingRequests()).toHaveLength(0);
  });
  it("ignores a trigger outside a map surface", async () => {
    const test = await setup();
    expect(test.result.current.onMapPingStart(test.event(true))).toBe(false);
    expect(test.play).not.toHaveBeenCalled();
    expect(test.pingRequests()).toHaveLength(0);
  });
  it("removes a rejected optimistic ping without replaying its sound", async () => {
    const test = await setup();
    test.tap();
    const request = test.pingRequests()[0];
    if (!request || !("requestId" in request) || !request.requestId)
      throw new Error("Missing ping request");
    const requestId = request.requestId;
    act(() =>
      test.wire.receive({
        v: 1,
        requestId,
        status: "success",
        data: { status: "rejected", code: "invalid-context" },
      }),
    );
    await waitFor(() => expect(test.removeDraw).toHaveBeenCalledOnce());
    expect(test.play).toHaveBeenCalledOnce();
  });
  it("plays once for a received remote ping and ignores redelivery", async () => {
    const test = await setup();
    await test.receive(remotePing(), remotePing());
    expect(test.addDraw).toHaveBeenCalledOnce();
    expect(test.play).toHaveBeenCalledOnce();
  });
  it("receives pings after preferences become enabled", async () => {
    const test = await setup({ enabled: false });
    await act(async () => {
      test.setEnabled(true);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });
    await test.receive(remotePing());
    expect(test.play).toHaveBeenCalledOnce();
  });
  it("ignores remote pings on the old interface", async () => {
    const test = await setup({ oldInterface: true });
    await test.receive(remotePing());
    expect(test.play).not.toHaveBeenCalled();
    expect(test.addDraw).not.toHaveBeenCalled();
  });
  it("drops an unsupported raw ping type before presentation", async () => {
    const test = await setup();
    const bytes = encodeRealtimeFrame(remotePing());
    const text = new TextDecoder().decode(bytes);
    const marker = new TextEncoder().encode("attention");
    const offset = bytes.findIndex((_, index) =>
      marker.every((byte, j) => bytes[index + j] === byte),
    );
    expect(text).toContain("attention");
    expect(offset).toBeGreaterThanOrEqual(0);
    bytes.set(new TextEncoder().encode("bad-value"), offset);
    await act(() => test.wire.receiveBytes(bytes));
    expect(test.play).not.toHaveBeenCalled();
    expect(test.addDraw).not.toHaveBeenCalled();
  });
});
