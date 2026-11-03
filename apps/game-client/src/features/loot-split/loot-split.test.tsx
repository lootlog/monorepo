import { createNotificationsResponse } from "@/test/game-account-preferences-fixtures";
import {
  accountPreferenceValues,
  createSettingsDocuments,
  seedSettingsDocuments,
} from "@/test/settings-documents-fixtures";
import {
  REALTIME_LOOT_SPLIT_AUTO_ACCEPT_CAPABILITY,
  REALTIME_LOOT_SPLIT_CAPABILITY,
} from "@lootlog/protocol/realtime";
import type { GameEvent, Item } from "@lootlog/margonem/game-events";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { UserGameAccountPreferencesResponseDtoOutput } from "@lootlog/client/main";
import { createNativeRuntime } from "@/test/native-runtime";
import { createRealtimeTest } from "@/test/realtime-test";
import { createDetectorSettings } from "@/lib/game-account-preferences";
import { useGlobalStore } from "@/store/global.store";
import { lootSplitStore } from "./loot-split-store";

vi.stubGlobal("Engine", createNativeRuntime());

const { AppContent } = await import("@/app-content");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const HERO = "101";

const item = (
  hid: string,
  name: string,
  reqp: string,
  rarity = "common",
): Item => ({
  hid,
  name,
  icon: "zbr/zbroja1591.gif",
  stat: `rarity=${rarity};reqp=${reqp}`,
  loc: "l",
  pr: 1,
  prc: "zl",
  st: 0,
  own: Number(HERO),
  cl: 8,
  tpl: 0,
});

const SPLIT_ITEMS = {
  "1200653658": item("274d", "Skromny pancerz piłowca", "b"),
  "1200653660": item("d835", "Szelki mutanta", "h"),
};

const groupLoot = (
  members: Record<string, { nick: string; prof: string }>,
  items: Record<string, Item> = SPLIT_ITEMS,
): GameEvent => ({
  ev: Date.now() / 1_000,
  party: {
    members: Object.fromEntries(
      Object.entries(members).map(([id, member]) => [
        id,
        { account: 1, icon: "/hero.gif", ...member },
      ]),
    ),
  },
  item: items,
  loot: {
    init: Object.keys(members).length,
    endTs: Date.now() / 1_000 + 20,
    source: "fight",
    states: Object.fromEntries(Object.keys(items).map((id) => [id, 1])),
  },
});

const setup = async (lootSplit?: { enabled: boolean; rarities: string[] }) => {
  const test = createRealtimeTest();
  const native = createNativeRuntime();
  const request = vi.fn<(command: string) => void>();
  vi.stubGlobal("Engine", native);
  vi.stubGlobal("_g", request);

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

  seedSettingsDocuments(
    test.queryClient,
    createSettingsDocuments({
      ...accountPreferenceValues(preferences),
      "gameData.lootSplit": lootSplit,
    }),
    { gameAccountId: "202", characterId: HERO },
  );
  const view = render(<AppContent />, { wrapper: test.wrapper });
  test.open();

  await waitFor(() =>
    expect(
      test.wire.frames.some(
        (frame) => "type" in frame && frame.type === "session.join",
      ),
    ).toBe(true),
  );

  const join = test.wire.frames.findLast(
    (frame) => "type" in frame && frame.type === "session.join",
  );

  if (!join || !("requestId" in join) || !join.requestId)
    throw new Error("Expected the initialized character's join request");
  const requestId = join.requestId;
  await act(() =>
    test.wire.receive({
      v: 1,
      requestId,
      status: "success",
      data: {
        connectionId: "test",
        organizationIds: ["guild-1"],
        capabilities: [
          REALTIME_LOOT_SPLIT_CAPABILITY,
          REALTIME_LOOT_SPLIT_AUTO_ACCEPT_CAPABILITY,
        ],
      },
    }),
  );
  await waitFor(() =>
    expect(useGlobalStore.getState().socketState.joined).toBe(true),
  );

  // The game hands packets to `parseJSON` and requests to `_g`; Lootlog
  // observes both through the wrappers it installed.
  const receivePacket = (event: GameEvent) =>
    act(() => {
      native.communication.parseJSON(event);
    });

  const gameWindow: Window & { _g?: (command: string) => void } = window;

  const sendCommand = (command: string) =>
    act(() => {
      gameWindow._g?.(command);
    });

  const sentChoices = () =>
    test.wire.frames.flatMap((frame) =>
      "type" in frame && frame.type === "loot-split.send" ? [frame.data] : [],
    );

  const sentFilterAccepts = () =>
    test.wire.frames.flatMap((frame) =>
      "type" in frame && frame.type === "loot-split.auto-accept"
        ? [frame.data]
        : [],
    );

  return {
    test,
    view,
    request,
    receivePacket,
    sendCommand,
    sentChoices,
    sentFilterAccepts,
  };
};

it("shares the hero's choices with the split's other participants and shows theirs", async () => {
  const { test, view, request, receivePacket, sendCommand, sentChoices } =
    await setup();

  await receivePacket(
    groupLoot({
      [HERO]: { nick: "Tester", prof: "w" },
      "365": { nick: "Knoper S", prof: "h" },
      "1466": { nick: "Garberere", prof: "b" },
    }),
  );

  await waitFor(() =>
    expect(sentChoices()).toEqual([
      {
        splitId: "1200653658",
        choices: { "1200653658": 1, "1200653660": 1 },
        accepted: false,
        recipientCharacterIds: ["365", "1466"],
      },
    ]),
  );

  // Two quick changes leave as one frame with the latest choices.
  await sendCommand("loot&want=1200653660&not=1200653658&must=&final=0");
  await receivePacket({
    loot: { source: "fight", states: { "1200653658": 0, "1200653660": 1 } },
  });
  await sendCommand("loot&want=&not=1200653658,1200653660&must=&final=0");
  await receivePacket({
    loot: { source: "fight", states: { "1200653658": 0, "1200653660": 0 } },
  });
  await waitFor(() => expect(sentChoices()).toHaveLength(2));
  expect(sentChoices()[1]?.choices).toEqual({
    "1200653658": 0,
    "1200653660": 0,
  });

  await sendCommand("loot&want=&not=1200653658,1200653660&must=&final=1");
  await new Promise((resolve) => setTimeout(resolve, 200));
  // The party sees the accept only once the server takes it.
  expect(sentChoices()).toHaveLength(2);
  await receivePacket({
    loot: { source: "fight", states: { "1200653658": 0, "1200653660": 0 } },
  });
  await waitFor(() => expect(sentChoices()).toHaveLength(3));
  expect(sentChoices()[2]?.accepted).toBe(true);
  // Observing the requests never changes what the game sends.
  expect(request).toHaveBeenCalledTimes(3);

  await act(() =>
    test.wire.receive({
      v: 1,
      type: "loot-split.received",
      data: {
        splitId: "1200653658",
        world: "luvia",
        sender: { characterId: "365", name: "Knoper S" },
        choices: { "1200653658": 0, "1200653660": 2 },
        accepted: false,
        sentAt: 1,
      },
    }),
  );

  const split = await screen.findByRole("region", { name: "Podział łupów" });

  expect(
    await screen.findByRole("img", {
      name: /^Knoper S · Szelki mutanta: Bardzo chcę/,
    }),
  ).toBeInTheDocument();
  expect(split).toHaveTextContent("Wybiera: 1");
  // Garberere sent nothing: no Lootlog, or no shared Lootlog.
  expect(split).toHaveTextContent("Bez danych: 1");
  act(() => view.unmount());
});

it("keeps a solo loot to itself", async () => {
  const { view, receivePacket, sentChoices } = await setup();

  await receivePacket(
    groupLoot(
      { [HERO]: { nick: "Tester", prof: "w" } },
      { "1200700001": item("50f0", "Hełm", "w") },
    ),
  );
  await new Promise((resolve) => setTimeout(resolve, 200));

  expect(
    sentChoices().filter(({ splitId }) => splitId === "1200700001"),
  ).toEqual([]);
  expect(
    lootSplitStore
      .getSnapshot()
      .state.splits.some(({ id }) => id === "1200700001"),
  ).toBe(false);
  act(() => view.unmount());
});

it("opens the window only for a split that drops a chosen rarity, and shares choices for every split", async () => {
  const { view, receivePacket, sentChoices } = await setup({
    enabled: true,
    rarities: ["LEGENDARY", "HEROIC"],
  });

  const party = {
    [HERO]: { nick: "Tester", prof: "w" },
    "365": { nick: "Knoper S", prof: "h" },
  };

  await receivePacket(
    groupLoot(party, { "1200800001": item("61a0", "Hełm", "w", "unique") }),
  );
  await waitFor(() =>
    expect(sentChoices().map(({ splitId }) => splitId)).toContain("1200800001"),
  );
  expect(
    screen.queryByRole("region", { name: "Podział łupów" }),
  ).not.toBeInTheDocument();

  await receivePacket(
    groupLoot(party, {
      "1200800002": item("61a1", "Pierścień", "w", "heroic"),
    }),
  );

  expect(
    await screen.findByRole("region", { name: "Podział łupów" }),
  ).toHaveTextContent("Knoper S");
  // The earlier split dropped nothing chosen, so it stays out of the window.
  expect(
    screen.queryByRole("region", { name: "Wcześniejszy podział" }),
  ).toBeNull();
  act(() => view.unmount());
});

it("tells the fight's players when the hero's loot filter took the drop, and shows theirs", async () => {
  const { test, view, receivePacket, sentFilterAccepts } = await setup();

  const warrior = (id: number, name: string) => ({
    id,
    originalId: id,
    name,
    lvl: 300,
    prof: "w",
    hpp: 100,
    icon: "/hero.gif",
    team: id > 0 ? 1 : 2,
    wt: 0,
    type: 0,
  });

  // The game sends a filtered player no loot window, only the battle log.
  await receivePacket({
    f: {
      init: "1",
      auto: "1",
      endBattle: 1,
      w: {
        [HERO]: warrior(Number(HERO), "Tester"),
        "16051": warrior(16051, "definitely not safe"),
        "-115101": warrior(-115101, "Sługa piasków"),
      },
      m: ["0;0;txt=Sługa piasków: zdobyto Przepaska zaklinacza sępów"],
    },
  });
  await waitFor(() =>
    expect(sentFilterAccepts()).toEqual([{ recipientCharacterIds: ["16051"] }]),
  );

  await receivePacket(
    groupLoot({
      [HERO]: { nick: "Tester", prof: "w" },
      "365": { nick: "Knoper S", prof: "h" },
    }),
  );
  await act(() =>
    test.wire.receive({
      v: 1,
      type: "loot-split.auto-accepted",
      data: {
        world: "luvia",
        sender: { characterId: "365", name: "Knoper S" },
        sentAt: 1,
      },
    }),
  );

  const split = await screen.findByRole("region", { name: "Podział łupów" });

  await waitFor(() =>
    expect(
      screen.getByTitle("Zaakceptowane przez filtr łupów"),
    ).toHaveTextContent("Knoper S"),
  );
  expect(split).not.toHaveTextContent("Bez danych");
  act(() => view.unmount());
});
