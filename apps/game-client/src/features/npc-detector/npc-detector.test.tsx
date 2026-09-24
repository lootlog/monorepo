import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createRealtimeTest } from "@/test/realtime-test";
import {
  type GameNpcWithLocation,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { useSettingsStore } from "@/store/settings.store";
import { useWindowsStore } from "@/store/windows.store";
import { NpcDetector } from "./npc-detector";

const createHero = (id: number): GameNpcWithLocation => ({
  id,
  tpl: id,
  nick: `Heros ${id}`,
  icon: "npc.gif",
  prof: "w",
  lvl: 120,
  wt: 85,
  type: 2,
  x: 10,
  y: 20,
  location: "Ithan",
  notificationSentAt: null,
});

let test: ReturnType<typeof createRealtimeTest>;

beforeEach(() => {
  test = createRealtimeTest();
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(320);
  useSettingsStore.setState({ animationEffectsEnabled: false });
  useNpcDetectorStore.setState({ npcs: [createHero(1), createHero(2)] });
  useWindowsStore.getState().setOpen("npc-detector", true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  act(() => {
    useNpcDetectorStore.setState(useNpcDetectorStore.getInitialState(), true);
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
    useWindowsStore.getState().setOpen("npc-detector", false);
  });
});

it("keeps detections when the window closes and empties it only on clear", () => {
  render(<NpcDetector />, { wrapper: test.wrapper });

  fireEvent.click(screen.getByRole("button", { name: "Zamknij okno" }));
  expect(screen.queryByText("Heros 1")).not.toBeInTheDocument();
  expect(useNpcDetectorStore.getState().npcs).toHaveLength(2);

  // The next detection reopens the window.
  act(() => useWindowsStore.getState().setOpen("npc-detector", true));
  expect(screen.getByText("Heros 1")).toBeVisible();
  expect(screen.getByText("Heros 2")).toBeVisible();

  fireEvent.click(
    screen.getByRole("button", { name: "Wyczyść listę wykrytych potworów" }),
  );
  expect(useNpcDetectorStore.getState().npcs).toEqual([]);
  expect(screen.queryByText("Heros 1")).not.toBeInTheDocument();
});

it("marks detections as not shared while the connection is down", async () => {
  render(<NpcDetector />, { wrapper: test.wrapper });
  test.open();
  await test.join();
  vi.useFakeTimers();

  act(() => test.wire.close());
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(0));

  expect(
    screen.getByText("Połączenie przerwane, ponowne łączenie…"),
  ).toBeVisible();
  expect(screen.getByText("Heros 1")).toBeVisible();
});
