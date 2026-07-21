import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode, Ref } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NpcsList } from "./npcs-list";

const mocks = vi.hoisted(() => ({
  npcListItem: vi.fn((_props: unknown) => null),
  activeDetectionAnimations: {} as Record<number, number>,
  clearDetectionAnimation: vi.fn(),
  orchestration: {
    isCreatingNpcPartyGathering: false,
    isSendingNpcNotification: false,
    startNpcNotification: vi.fn(),
    startNpcPartyGathering: vi.fn(),
  },
  usePartyGatheringOrchestration: vi.fn(),
  setNpcStates: vi.fn(),
  animationEffectsEnabled: false,
}));

vi.mock("@/components/ui/native-scroll-area", () => ({
  NativeScrollArea: ({
    children,
    ref,
  }: {
    children: ReactNode;
    ref?: Ref<HTMLDivElement>;
  }) => (
    <div data-testid="npc-scroll-viewport" ref={ref}>
      {children}
    </div>
  ),
}));

vi.mock("@/features/npc-detector/components/npc-list-item", () => ({
  NpcListItem: (props: { npc: { id: number } }) => {
    mocks.npcListItem(props);
    return <div data-testid={`npc-${props.npc.id}`} />;
  },
}));

vi.mock(
  "@/features/party-finder/hooks/use-party-gathering-orchestration",
  () => ({
    usePartyGatheringOrchestration: () =>
      mocks.usePartyGatheringOrchestration(),
  }),
);

vi.mock("@/store/npc-detector.store", () => ({
  useNpcDetectorStore: (
    selector: (state: Record<string, unknown>) => unknown,
  ) =>
    selector({
      activeDetectionAnimations: mocks.activeDetectionAnimations,
      clearDetectionAnimation: mocks.clearDetectionAnimation,
      latestDetectionAnimationCycle: 0,
      npcs: [{ id: 1 }, { id: 2 }],
      removeNpc: vi.fn(),
      setNpcState: vi.fn(),
      setNpcStates: mocks.setNpcStates,
    }),
}));

vi.mock("@/store/settings.store", () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ animationEffectsEnabled: mocks.animationEffectsEnabled }),
}));

vi.mock("@/store/party-finder.store", () => ({
  selectOwnedReadyRoom: () => null,
  usePartyFinderStore: (
    selector: (state: Record<string, unknown>) => unknown,
  ) => selector({}),
}));

vi.mock("@/store/windows.store", () => ({
  useWindowsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ setOpen: vi.fn() }),
}));

describe("NpcsList", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      value: 320,
    });
    mocks.npcListItem.mockClear();
    mocks.activeDetectionAnimations = {};
    mocks.animationEffectsEnabled = false;
    mocks.clearDetectionAnimation.mockReset();
    mocks.setNpcStates.mockReset();
    mocks.usePartyGatheringOrchestration.mockReset();
    mocks.usePartyGatheringOrchestration.mockReturnValue(mocks.orchestration);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates one orchestration observer for the whole list", () => {
    render(
      <NpcsList
        detectorSettings={{ routingRules: [] } as never}
        npcs={[{ id: 1 }, { id: 2 }] as never}
      />,
    );

    expect(mocks.usePartyGatheringOrchestration).toHaveBeenCalledOnce();
    expect(mocks.npcListItem).toHaveBeenCalledTimes(2);
    expect(mocks.npcListItem.mock.calls[0]?.[0]).toMatchObject({
      orchestration: mocks.orchestration,
    });
    expect(mocks.npcListItem.mock.calls[1]?.[0]).toMatchObject({
      orchestration: mocks.orchestration,
    });
  });

  it("bounds mounted rows for a large NPC list", () => {
    const npcs = Array.from({ length: 500 }, (_, id) => ({ id }));

    render(
      <NpcsList
        detectorSettings={{ routingRules: [] } as never}
        npcs={npcs as never}
      />,
    );

    expect(screen.getAllByRole("listitem").length).toBeLessThanOrEqual(20);
    expect(screen.getByTestId("npc-0")).toBeInTheDocument();
    expect(screen.queryByTestId("npc-100")).not.toBeInTheDocument();
  });

  it("mounts NPC rows reached by scrolling", () => {
    const npcs = Array.from({ length: 500 }, (_, id) => ({ id }));

    render(
      <NpcsList
        detectorSettings={{ routingRules: [] } as never}
        npcs={npcs as never}
      />,
    );

    const viewport = screen.getByTestId("npc-scroll-viewport");
    viewport.scrollTop = 100 * 54;
    fireEvent.scroll(viewport);

    expect(screen.getByTestId("npc-100")).toBeInTheDocument();
    expect(screen.queryByTestId("npc-0")).not.toBeInTheDocument();
  });

  it("does not replay an entry animation when virtualization remounts an existing row", () => {
    mocks.animationEffectsEnabled = true;
    const npcs = Array.from({ length: 500 }, (_, id) => ({ id }));

    render(
      <NpcsList
        detectorSettings={{ routingRules: [] } as never}
        npcs={npcs as never}
      />,
    );

    const viewport = screen.getByTestId("npc-scroll-viewport");
    viewport.scrollTop = 100 * 54;
    fireEvent.scroll(viewport);

    expect(screen.getByTestId("npc-100").parentElement).not.toHaveClass(
      "ll-npc-list-enter",
    );
  });

  it("animates existing rows from their previous position when detections reorder the list", () => {
    mocks.animationEffectsEnabled = true;
    const animate = vi.fn(() => ({
      cancel: vi.fn(),
      oncancel: null,
      onfinish: null,
    }));
    const originalAnimate = HTMLElement.prototype.animate;
    HTMLElement.prototype.animate = animate as never;

    try {
      const { rerender } = render(
        <NpcsList
          detectorSettings={{ routingRules: [] } as never}
          npcs={[{ id: 1 }, { id: 2 }] as never}
        />,
      );
      animate.mockClear();

      rerender(
        <NpcsList
          detectorSettings={{ routingRules: [] } as never}
          npcs={[{ id: 3 }, { id: 1 }, { id: 2 }] as never}
        />,
      );

      expect(animate).toHaveBeenCalledTimes(2);
      expect(animate).toHaveBeenCalledWith(
        [{ transform: "translateY(-54px)" }, { transform: "translateY(0)" }],
        expect.objectContaining({ duration: 180 }),
      );
    } finally {
      HTMLElement.prototype.animate = originalAnimate;
    }
  });

  it("retains a removed visible row until its exit animation completes", () => {
    mocks.animationEffectsEnabled = true;
    const { rerender } = render(
      <NpcsList
        detectorSettings={{ routingRules: [] } as never}
        npcs={[{ id: 1 }, { id: 2 }] as never}
      />,
    );

    rerender(
      <NpcsList
        detectorSettings={{ routingRules: [] } as never}
        npcs={[{ id: 2 }] as never}
      />,
    );

    const exitingNpc = screen.getByTestId("npc-1");
    expect(exitingNpc.parentElement).toHaveClass(
      "ll:animate-out",
      "ll:fade-out-0",
    );

    fireEvent.animationEnd(exitingNpc.parentElement as HTMLElement);

    expect(screen.queryByTestId("npc-1")).not.toBeInTheDocument();
  });

  it("expires cooldowns and detection animations while their row is offscreen", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T12:00:00.000Z"));
    mocks.activeDetectionAnimations = { 0: 7 };
    const npcs = Array.from({ length: 500 }, (_, id) => ({
      id,
      notificationSent: id === 0,
    }));

    render(
      <NpcsList
        detectorSettings={{ routingRules: [] } as never}
        npcs={npcs as never}
      />,
    );

    const viewport = screen.getByTestId("npc-scroll-viewport");
    viewport.scrollTop = 100 * 54;
    fireEvent.scroll(viewport);
    expect(screen.queryByTestId("npc-0")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(5500));

    expect(mocks.setNpcStates).toHaveBeenCalledWith([
      { npcId: 0, npc: { notificationSent: false } },
    ]);
    expect(mocks.clearDetectionAnimation).toHaveBeenCalledWith(0, 7);

    viewport.scrollTop = 0;
    fireEvent.scroll(viewport);
    expect(screen.getByTestId("npc-0")).toBeInTheDocument();
  });
});
