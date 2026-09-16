import { act, fireEvent, render, screen } from "@testing-library/react";
import { Profiler, type ProfilerOnRenderCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import {
  defaultDetectorSettings,
  type DetectorSettings,
} from "@lootlog/schema/account-preferences";
import {
  useNpcDetectorStore,
  type GameNpcWithLocation,
} from "@/store/npc-detector.store";
import { useSettingsStore } from "@/store/settings.store";
import { NpcsList } from "./npcs-list";

const createNpc = (id: number): GameNpcWithLocation => ({
  id,
  tpl: id,
  nick: `NPC ${id}`,
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

const StoredNpcs = ({
  detectorSettings = defaultDetectorSettings,
}: {
  detectorSettings?: DetectorSettings;
}) => {
  const npcs = useNpcDetectorStore((state) => state.npcs);

  return <NpcsList detectorSettings={detectorSettings} npcs={npcs} />;
};

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(320);
  useNpcDetectorStore.setState(useNpcDetectorStore.getInitialState(), true);
  useSettingsStore.setState({ animationEffectsEnabled: false });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const mountNpcs = (
  npcs: GameNpcWithLocation[],
  animate = false,
  onRender: ProfilerOnRenderCallback = () => undefined,
  detectorSettings?: DetectorSettings,
) => {
  useNpcDetectorStore.setState({ npcs });
  useSettingsStore.setState({ animationEffectsEnabled: animate });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <Profiler id="npc-list" onRender={onRender}>
        <StoredNpcs detectorSettings={detectorSettings} />
      </Profiler>
    </QueryClientProvider>,
  );

  onTestFinished(() => {
    view.unmount();
    queryClient.clear();
  });

  const viewport = view.container.querySelector(
    "[data-ll-scroll-area-viewport]",
  );

  if (!(viewport instanceof HTMLElement))
    throw new Error("Expected the native NPC scroll viewport");

  return { viewport };
};

it("bounds mounted rows for five hundred NPCs and mounts rows reached by scrolling", () => {
  const { viewport } = mountNpcs(
    Array.from({ length: 500 }, (_, id) => createNpc(id)),
  );

  expect(screen.getAllByRole("listitem").length).toBeLessThanOrEqual(20);
  expect(screen.getByText("NPC 0")).toBeVisible();
  expect(screen.queryByText("NPC 100")).not.toBeInTheDocument();
  viewport.scrollTop = 100 * 54;
  fireEvent.scroll(viewport);
  expect(screen.getByText("NPC 100")).toBeVisible();
  expect(screen.queryByText("NPC 0")).not.toBeInTheDocument();
  expect(screen.getAllByRole("listitem").length).toBeLessThanOrEqual(20);
});

it("does not replay entry animation when virtualization remounts an existing row", () => {
  const { viewport } = mountNpcs(
    Array.from({ length: 500 }, (_, id) => createNpc(id)),
    true,
  );

  viewport.scrollTop = 100 * 54;
  fireEvent.scroll(viewport);
  expect(screen.getByText("NPC 100").closest("li")).not.toHaveClass(
    "ll-npc-list-enter",
  );
});

it("animates retained rows from their previous positions after detections reorder the list", () => {
  const animate = vi.fn<HTMLElement["animate"]>(() => {
    const events = new EventTarget();

    const animation: Animation = {
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
      dispatchEvent: events.dispatchEvent.bind(events),
      currentTime: null,
      effect: null,
      id: "npc-layout",
      oncancel: null,
      onfinish: null,
      onremove: null,
      overallProgress: null,
      pending: false,
      playState: "running" as const,
      playbackRate: 1,
      replaceState: "active" as const,
      startTime: null,
      timeline: null,
      get ready() {
        return Promise.resolve(animation);
      },
      get finished() {
        return Promise.resolve(animation);
      },
      cancel: vi.fn<Animation["cancel"]>(),
      commitStyles: vi.fn<Animation["commitStyles"]>(),
      finish: vi.fn<Animation["finish"]>(),
      pause: vi.fn<Animation["pause"]>(),
      persist: vi.fn<Animation["persist"]>(),
      play: vi.fn<Animation["play"]>(),
      reverse: vi.fn<Animation["reverse"]>(),
      updatePlaybackRate: vi.fn<Animation["updatePlaybackRate"]>(),
    };

    return animation;
  });

  const original = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "animate",
  );

  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: animate,
  });
  onTestFinished(() => {
    if (original)
      Object.defineProperty(HTMLElement.prototype, "animate", original);
    else Reflect.deleteProperty(HTMLElement.prototype, "animate");
  });
  mountNpcs([createNpc(1), createNpc(2)], true);
  animate.mockClear();
  act(() =>
    useNpcDetectorStore.setState({
      npcs: [createNpc(3), createNpc(1), createNpc(2)],
    }),
  );
  expect(animate).toHaveBeenCalledTimes(2);
  expect(animate).toHaveBeenCalledWith(
    [{ transform: "translateY(-54px)" }, { transform: "translateY(0)" }],
    expect.objectContaining({ duration: 180 }),
  );
});

it("retains a removed visible row until its exit animation finishes", () => {
  mountNpcs([createNpc(1), createNpc(2)], true);
  act(() => useNpcDetectorStore.getState().removeNpc(1));
  const exiting = screen.getByText("NPC 1").closest('[aria-hidden="true"]');
  expect(exiting).toHaveClass("ll:animate-out", "ll:fade-out-0");

  if (!exiting) throw new Error("Expected an exiting NPC row");
  fireEvent.animationEnd(exiting);
  expect(screen.queryByText("NPC 1")).not.toBeInTheDocument();
  expect(screen.getByText("NPC 2")).toBeVisible();
});

it("expires cooldowns and detection animations while their row is offscreen", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-20T12:00:00.000Z"));
  useNpcDetectorStore.setState({ activeDetectionAnimations: { 0: 7 } });

  const { viewport } = mountNpcs(
    Array.from({ length: 500 }, (_, id) => ({
      ...createNpc(id),
      notificationSentAt: id === 0 ? Date.now() : null,
    })),
  );

  viewport.scrollTop = 100 * 54;
  fireEvent.scroll(viewport);
  expect(screen.queryByText("NPC 0")).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(5500));
  expect(
    useNpcDetectorStore.getState().npcs.find((npc) => npc.id === 0)
      ?.notificationSentAt,
  ).toBeNull();
  expect(useNpcDetectorStore.getState().activeDetectionAnimations).toEqual({});
  viewport.scrollTop = 0;
  fireEvent.scroll(viewport);
  expect(screen.getByText("NPC 0")).toBeVisible();
});

it("commits a notification cooldown once per second, not on a polling clock", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-20T12:00:00.000Z"));
  let updateCommits = 0;

  mountNpcs(
    [
      { ...createNpc(1), notificationSentAt: Date.now() },
      createNpc(2),
      createNpc(3),
    ],
    false,
    (_id, phase) => {
      if (phase === "update") updateCommits += 1;
    },
    {
      ...defaultDetectorSettings,
      routingRules: [
        { id: "rule-1", minLevel: 1, maxLevel: 500, guildIds: ["guild-1"] },
      ],
    },
  );

  const cooldownButton = screen.getByRole("button", { name: "5" });
  updateCommits = 0;

  for (let second = 0; second < 4; second += 1) {
    act(() => vi.advanceTimersByTime(1000));
  }

  act(() => vi.advanceTimersByTime(200));

  expect(cooldownButton).toHaveTextContent("1");
  expect(updateCommits).toBe(4);

  act(() => vi.advanceTimersByTime(800));

  expect(
    useNpcDetectorStore.getState().npcs.find((npc) => npc.id === 1)
      ?.notificationSentAt,
  ).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});

it("restarts the countdown when the same NPC is notified again mid-cooldown", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-20T12:00:00.000Z"));

  mountNpcs(
    [{ ...createNpc(1), notificationSentAt: Date.now() }],
    false,
    undefined,
    {
      ...defaultDetectorSettings,
      routingRules: [
        { id: "rule-1", minLevel: 1, maxLevel: 500, guildIds: ["guild-1"] },
      ],
    },
  );

  act(() => vi.advanceTimersByTime(3000));
  expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();

  act(() =>
    useNpcDetectorStore
      .getState()
      .setNpcStates([{ npcId: 1, npc: { notificationSentAt: Date.now() } }]),
  );

  expect(screen.getByRole("button", { name: "5" })).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(5000));
  expect(
    useNpcDetectorStore.getState().npcs.find((npc) => npc.id === 1)
      ?.notificationSentAt,
  ).toBeNull();
});
