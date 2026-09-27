import { createNotificationsResponse } from "@/test/game-account-preferences-fixtures";
import { encodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import { REALTIME_BATTLE_PING_CAPABILITY } from "@lootlog/protocol/realtime";
import {
  accountPreferenceValues,
  createSettingsDocuments,
  seedSettingsDocuments,
  seedSettingsDocumentValues,
  soundSettingValues,
} from "@/test/settings-documents-fixtures";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  UserGameAccountPreferencesResponseDtoOutput,
  SoundSettingsResponseDto,
} from "@lootlog/client/main";
import { createRealtimeTest } from "@/test/realtime-test";
import { createDetectorSettings } from "@/lib/game-account-preferences";
import { useGlobalStore } from "@/store/global.store";
import { useSettingsStore } from "@/store/settings.store";
import { useGameStore } from "@/store/game.store";
import { disposeSoundPlayback } from "@/lib/sound-playback";
import {
  useBattleStore,
  type BattleWarriorsWithAccountId,
} from "@/store/game-store/battle.store";
import { usePings } from "./use-pings";
import { mapPingController } from "./map-ping-controller";
import { battlePingStore } from "./battle-ping-store";
import { pingInteractionController } from "./ping-interaction-controller";

const preferences = (
  enabled: boolean,
): UserGameAccountPreferencesResponseDtoOutput => ({
  accountId: "1",
  notifications: createNotificationsResponse(),
  detector: createDetectorSettings(),
  pings: { enabled },
  airTags: { enabled: true },
  hasStoredNotifications: true,
  hasStoredDetector: true,
  hasStoredPings: true,
  hasStoredAirTags: true,
  hasStoredPreferences: true,
});

const monster = {
  collider: { box: [384, 240, 416, 320] as const },
  d: { id: 91, type: 2, x: 12, y: 9 },
  ry: 9,
};

const remotePing = () => ({
  v: 1 as const,
  type: "map-ping.received" as const,
  data: {
    pingId: "remote-1",
    world: "luvia",
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
  npcUnderCursor = false,
} = {}) => {
  const test = createRealtimeTest();

  seedSettingsDocuments(
    test.queryClient,
    createSettingsDocuments({
      ...accountPreferenceValues(preferences(enabled)),
      "gameData.battlePings": { enabled },
    }),
  );
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
    // A 32×80 monster standing on tile (12, 9); the press lands on its body.
    npcs: {
      check: () => (npcUnderCursor ? { "91": monster } : {}),
      getById: (id: number) =>
        npcUnderCursor && id === 91 ? monster : undefined,
    },
  });
  const canvas = document.createElement("canvas");
  canvas.id = "GAME_CANVAS";
  canvas.width = 640;
  canvas.height = 640;
  document.body.append(canvas);
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 640, 640),
  );
  const view = renderHook(() => usePings(), { wrapper: test.wrapper });

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
          data: {
            connectionId: "test",
            organizationIds: ["guild-1"],
            capabilities: [REALTIME_BATTLE_PING_CAPABILITY],
          },
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

  seedSettingsDocumentValues(test.queryClient, soundSettingValues(sound));

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
      started = view.result.current.onPingStart(event());
      view.result.current.onPingEnd(new MouseEvent("mouseup", { button: 1 }));
    });

    return started;
  };

  const pingRequests = () =>
    test.wire.frames.filter(
      (frame) => "type" in frame && frame.type === "map-ping.send",
    );

  const setEnabled = (value: boolean) =>
    seedSettingsDocumentValues(test.queryClient, {
      ...accountPreferenceValues(preferences(value)),
      "gameData.battlePings": { enabled: value },
    });

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
  pingInteractionController.cancel();
  battlePingStore.clear();
  useBattleStore.setState({ battleState: "idle", battleWarriors: {} });
  document.querySelector(".battle-window")?.remove();
  disposeSoundPlayback();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.querySelector("#GAME_CANVAS")?.remove();
});

describe("usePings on the map", () => {
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
      test.result.current.onPingStart(test.event());
      // Flicking up selects the top ring option without waiting for the hold.
      test.canvas.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          clientX: 400,
          clientY: 222,
        }),
      );
      test.result.current.onPingEnd(new MouseEvent("mouseup", { button: 1 }));
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
  it("attacks the monster under the cursor with a tap and names it for other clients", async () => {
    const test = await setup({ npcUnderCursor: true });

    expect(test.tap()).toBe(true);
    expect(test.pingRequests()).toEqual([
      expect.objectContaining({
        data: { expectedMapId: 42, npcId: 91, type: "enemy", x: 12, y: 9 },
      }),
    ]);
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
    expect(test.result.current.onPingStart(test.event(true))).toBe(false);
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

const warrior = (
  id: number,
  team: number,
  prof: string,
  hpp = 100,
): BattleWarriorsWithAccountId[string] => ({
  hpp,
  icon: "",
  id,
  lvl: 300,
  name: `Warrior ${id}`,
  originalId: id,
  prof,
  team,
  type: 0,
  wt: 0,
});

const startBattle = () => {
  useBattleStore.setState({
    battleState: "in-battle",
    battleWarriors: {
      "1": warrior(1, 1, "w"),
      "2": warrior(2, 1, "m"),
      "-5": warrior(-5, 2, ""),
      "7": warrior(7, 2, "t"),
    },
  });

  const battleWindow = document.createElement("div");
  battleWindow.className = "battle-window";

  for (const id of [1, 2, -5, 7]) {
    const element = document.createElement("div");
    element.className = `one-warrior other-id-battle-${id}`;
    battleWindow.append(element);
  }

  document.body.append(battleWindow);

  return (id: number) => {
    const element = battleWindow.querySelector(`.other-id-battle-${id}`);

    if (!element) throw new Error(`Missing warrior ${id}`);

    return element;
  };
};

const remoteBattlePing = (
  senderCharacterId: string,
  type: "attack" | "taunt",
  warriorId: number,
) => ({
  v: 1 as const,
  type: "battle-ping.received" as const,
  data: {
    pingId: `battle-${senderCharacterId}-${type}`,
    world: "luvia",
    mapId: 42,
    type,
    warriorId,
    sender: { characterId: senderCharacterId, name: "Leczek" },
    createdAt: Date.now(),
  },
});

describe("usePings in battle", () => {
  it("marks the attack target locally and tells only the other characters on the hero's team", async () => {
    const test = await setup();
    const warriorElement = startBattle();

    act(() => {
      const press = new MouseEvent("mousedown", {
        button: 1,
        clientX: 200,
        clientY: 200,
      });

      warriorElement(-5).dispatchEvent(press);
      test.result.current.onPingStart(press);
      test.result.current.onPingEnd(new MouseEvent("mouseup", { button: 1 }));
    });

    expect(battlePingStore.getSnapshot().target).toEqual({
      senderName: "Current Hero",
      warriorId: -5,
    });
    expect(
      test.wire.frames.filter(
        (frame) => "type" in frame && frame.type === "battle-ping.send",
      ),
    ).toEqual([
      expect.objectContaining({
        data: {
          expectedMapId: 42,
          recipientCharacterIds: ["2"],
          type: "attack",
          warriorId: -5,
        },
      }),
    ]);
  });

  it("shows a teammate's request for the hero and ignores pings from the other team or on the wrong side", async () => {
    const test = await setup();
    startBattle();

    await test.receive(
      remoteBattlePing("7", "attack", 2),
      // A teammate cannot mark an ally as the attack target.
      remoteBattlePing("2", "attack", 1),
      remoteBattlePing("2", "taunt", 1),
    );

    const { marks, target } = battlePingStore.getSnapshot();
    expect(target).toBeNull();
    expect(marks.get(1)).toMatchObject({ forMe: true, type: "taunt" });
    expect(test.play).toHaveBeenCalledOnce();
    expect(test.play.mock.instances[0]).toMatchObject({ playbackRate: 1.5 });
  });

  it("sends nothing when the target dies while the wheel is held", async () => {
    const test = await setup();
    const warriorElement = startBattle();

    act(() => {
      const press = new MouseEvent("mousedown", { button: 1 });

      warriorElement(-5).dispatchEvent(press);
      test.result.current.onPingStart(press);
      useBattleStore.getState().updateBattleWarriors({
        "-5": warrior(-5, 2, "", 0),
      });
      test.result.current.onPingEnd(new MouseEvent("mouseup", { button: 1 }));
    });

    expect(battlePingStore.getSnapshot().target).toBeNull();
    expect(
      test.wire.frames.some(
        (frame) => "type" in frame && frame.type === "battle-ping.send",
      ),
    ).toBe(false);
  });

  it("drops the target once it dies and every ping when the battle ends", async () => {
    const test = await setup();
    startBattle();

    await test.receive(
      remoteBattlePing("2", "attack", -5),
      remoteBattlePing("2", "taunt", 1),
    );
    expect(battlePingStore.getSnapshot().target?.warriorId).toBe(-5);

    act(() => {
      useBattleStore.getState().updateBattleWarriors({
        "-5": warrior(-5, 2, "", 0),
      });
    });
    expect(battlePingStore.getSnapshot().target).toBeNull();
    expect(battlePingStore.getSnapshot().marks.size).toBe(1);

    act(() => {
      useBattleStore.getState().endBattle();
    });
    expect(battlePingStore.getSnapshot().marks.size).toBe(0);
  });
});
