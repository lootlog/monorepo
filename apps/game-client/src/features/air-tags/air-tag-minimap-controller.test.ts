import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import type { AirTagTarget } from "@lootlog/schema/air-tag";
import { Capability } from "@lootlog/schema/permissions";
import { getSocket } from "@/lib/socket";
import { useGlobalStore } from "@/store/global.store";
import { createOnlinePlayersTest } from "@/test/online-players-fixtures";
import {
  setTestRuntimeGame,
  testRuntimeWindow,
} from "@/test/test-runtime-window";
import { AirTagMinimapController } from "./air-tag-minimap-controller";
import { airTagReceiveController } from "./air-tag-receive-controller";

const DRAW_EVENT = "call_draw_add_to_renderer";

const RED_MAP = { id: 7, name: "Ithan", visibility: 30, pvp: 2 };

const target = (overrides: Partial<AirTagTarget>): AirTagTarget => ({
  targetId: "1",
  nickname: "Rival",
  relation: 6,
  x: 80,
  y: 60,
  lvl: 250,
  prof: "m",
  clan: { id: 5, name: "Rivals" },
  observedAt: Date.now(),
  ...overrides,
});

const report = (targets: AirTagTarget[]) => {
  airTagReceiveController.beginSubscription("request", "luvia", 7);
  airTagReceiveController.applySubscriptionAck({
    status: "accepted",
    requestId: "request",
    scopes: [
      {
        guildId: "guild-1",
        world: "luvia",
        mapId: 7,
        epochId: "epoch",
        epochStartedAt: 1,
        revision: 1,
        serverTime: Date.now(),
        targets,
      },
    ],
  });
};

const installMinimap = ({
  hiddenKinds = [],
}: { hiddenKinds?: string[] } = {}) => {
  const canvas = document.createElement("canvas");

  canvas.width = 400;
  canvas.height = 400;
  canvas.getBoundingClientRect = () => new DOMRect(0, 0, 400, 400);

  const drawImage =
    vi.fn<(image: HTMLCanvasElement, x: number, y: number) => void>();

  const frames = new Set<() => void>();

  let hover: ((event: { clientX: number; clientY: number }) => void) | null =
    null;

  const shownTips: string[] = [];

  Object.assign(testRuntimeWindow, {
    $: () => ({
      on: (_events: string, handler: typeof hover) => {
        hover = handler;
      },
      off: () => {
        hover = null;
      },
    }),
    API: {
      addCallbackToEvent: (_event: string, callback: () => void) =>
        frames.add(callback),
      removeCallbackFromEvent: (_event: string, callback: () => void) =>
        frames.delete(callback),
    },
  });
  testRuntimeWindow.Engine = {
    apiData: { CALL_DRAW_ADD_TO_RENDERER: DRAW_EVENT },
    others: {
      createStrTip: ({ nick, clanName }: { nick: string; clanName: string }) =>
        `<b>${nick}</b><i>${clanName}</i>`,
    },
    miniMapController: {
      handHeldMiniMapController: {
        canUpdate: (_type: string, kind: string) => !hiddenKinds.includes(kind),
        getColorByKind: () => "#ff0000",
        // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- The game names its own method.
        getShapeByKind: () => 0,
        getHandHeldMiniMapWindow: () => ({
          getCanvas: () => canvas,
          getCtx: () => ({ drawImage, globalAlpha: 1 }),
          getMargin: () => ({ left: 10, top: 20 }),
          getSquareData: () => ({ normalSize: 4, minSize: 7, margin: 1.5 }),
          isShow: () => true,
        }),
        getMiniMapTipController: () => ({
          getObjectFromCordsArray: () => null,
          show: (
            _event: { clientX: number; clientY: number },
            object: { getTip: () => [string, string] },
          ) => shownTips.push(object.getTip()[0]),
        }),
      },
    },
  };

  return {
    drawImage,
    frame: () => frames.forEach((callback) => callback()),
    hover: (clientX: number, clientY: number) => hover?.({ clientX, clientY }),
    isDrawing: () => frames.size > 0,
    shownTips,
  };
};

const labels = { seen: (seconds: number) => `seen ${seconds}` };

beforeEach(() => setTestRuntimeGame({ map: RED_MAP }));

afterEach(() => airTagReceiveController.clear());

describe("AirTagMinimapController", () => {
  it("draws an enemy the hero cannot see where the game would, and tips it on hover", () => {
    const minimap = installMinimap();
    const controller = new AirTagMinimapController();

    report([target({}), target({ targetId: "near", x: 3, y: 4 })]);
    controller.setEnabled(true, labels);
    minimap.frame();

    expect(minimap.drawImage.mock.calls.map(([, x, y]) => [x, y])).toEqual([
      [329, 259],
    ]);

    minimap.hover(100, 100);
    expect(minimap.shownTips).toEqual([]);

    minimap.hover(332, 262);
    expect(minimap.shownTips).toHaveLength(1);
    expect(minimap.shownTips[0]).toContain("<b>Rival</b><i>Rivals</i>");
    expect(minimap.shownTips[0]).toContain("seen 0");

    controller.setEnabled(false, labels);
    expect(minimap.isDrawing()).toBe(false);
  });

  it("leaves the game's frame alone until an enemy is reported, and after the last one is gone", () => {
    const minimap = installMinimap();
    const controller = new AirTagMinimapController();

    controller.setEnabled(true, labels);
    expect(minimap.isDrawing()).toBe(false);

    report([target({})]);
    expect(minimap.isDrawing()).toBe(true);

    airTagReceiveController.clear();
    minimap.frame();
    expect(minimap.isDrawing()).toBe(false);

    setTestRuntimeGame({ map: { ...RED_MAP, pvp: 0 } });
    report([target({})]);
    expect(minimap.isDrawing()).toBe(false);
    controller.setEnabled(false, labels);
  });

  it("loads the presence of an Organization joined while it draws, with the players window closed", async () => {
    const harness = createOnlinePlayersTest();

    getSocket().connect();
    harness.open();
    await harness.join(
      ["guild-1", "guild-2"],
      createAccessPolicySnapshot(
        ["guild-1", "guild-2"].map((id) => ({
          guild: { id, ownerId: "owner" },
          roles: [
            {
              permissions: [Capability.LOOTLOG_ONLINE_PLAYERS_READ],
              lvlRangeFrom: 1,
              lvlRangeTo: 300,
            },
          ],
        })),
        "user",
      ),
    );
    setTestRuntimeGame({ world: "luvia", map: RED_MAP });
    useGlobalStore.getState().setSocketState({ joinedGuilds: ["guild-1"] });

    const minimap = installMinimap();
    const controller = new AirTagMinimapController();

    report([target({})]);
    controller.setEnabled(true, labels);
    await vi.waitFor(() =>
      expect(harness.fetchPresence).toHaveBeenCalledWith("guild-1", "luvia"),
    );
    expect(harness.fetchPresence).not.toHaveBeenCalledWith("guild-2", "luvia");

    useGlobalStore
      .getState()
      .setSocketState({ joinedGuilds: ["guild-1", "guild-2"] });
    minimap.frame();
    await vi.waitFor(() =>
      expect(harness.fetchPresence).toHaveBeenCalledWith("guild-2", "luvia"),
    );

    controller.setEnabled(false, labels);
    useGlobalStore.getState().setSocketState({ joinedGuilds: [] });
  });

  it("draws nothing for a kind the player hid on the game's minimap", () => {
    const minimap = installMinimap({ hiddenKinds: ["cl-en"] });
    const controller = new AirTagMinimapController();

    report([target({})]);
    controller.setEnabled(true, labels);
    minimap.frame();
    minimap.hover(332, 262);

    expect(minimap.drawImage).not.toHaveBeenCalled();
    expect(minimap.shownTips).toEqual([]);
    controller.setEnabled(false, labels);
  });
});
