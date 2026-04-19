import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type GameNpcWithLocation,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { NpcsList } from "./npcs-list";

const mockNpcListItem = vi.fn();

vi.mock("@/features/npc-detector/components/npc-list-item", () => ({
  NpcListItem: ({
    npc,
    detectionAnimationCycle,
  }: {
    npc: GameNpcWithLocation;
    detectionAnimationCycle: number | null;
  }) => {
    mockNpcListItem({ npc, detectionAnimationCycle });

    return (
      <div data-testid={`npc-${npc.id}`}>
        {npc.nick}:{detectionAnimationCycle ?? "none"}
      </div>
    );
  },
}));

const createNpc = (
  overrides?: Partial<GameNpcWithLocation>,
): GameNpcWithLocation => ({
  id: 1,
  nick: "Npc",
  x: 10,
  y: 20,
  tpl: 100,
  icon: "npc.gif",
  prof: "m",
  wt: 80,
  lvl: 200,
  type: 3,
  location: "Ithan",
  notificationSent: false,
  ...overrides,
});

describe("NpcsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNpcDetectorStore.setState({
      npcs: [],
      activeDetectionAnimations: {},
      latestDetectionAnimationCycle: 0,
    });
  });

  it("renders npc items in the given order and passes animation cycles from the store", () => {
    const firstNpc = createNpc({ id: 1, nick: "First" });
    const secondNpc = createNpc({ id: 2, nick: "Second" });

    useNpcDetectorStore.setState({
      activeDetectionAnimations: { 2: 3 },
      latestDetectionAnimationCycle: 3,
    });

    render(<NpcsList npcs={[firstNpc, secondNpc]} />);

    expect(screen.getByTestId("npc-1")).toHaveTextContent("First:none");
    expect(screen.getByTestId("npc-2")).toHaveTextContent("Second:3");
    expect(mockNpcListItem).toHaveBeenNthCalledWith(1, {
      npc: firstNpc,
      detectionAnimationCycle: null,
    });
    expect(mockNpcListItem).toHaveBeenNthCalledWith(2, {
      npc: secondNpc,
      detectionAnimationCycle: 3,
    });
  });

  it("does not scroll on mount when there is no detection cycle yet", () => {
    render(<NpcsList npcs={[createNpc()]} />);

    const viewport = document.querySelector(
      "[data-radix-scroll-area-viewport]",
    );

    if (!(viewport instanceof HTMLDivElement)) {
      throw new Error("Expected scroll viewport");
    }

    const scrollToSpy = vi.fn();
    Object.defineProperty(viewport, "scrollTo", {
      configurable: true,
      value: scrollToSpy,
    });

    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it("scrolls the viewport to the top when a new detection cycle appears", async () => {
    render(<NpcsList npcs={[createNpc()]} />);

    const viewport = document.querySelector(
      "[data-radix-scroll-area-viewport]",
    );

    if (!(viewport instanceof HTMLDivElement)) {
      throw new Error("Expected scroll viewport");
    }

    const scrollToSpy = vi.fn();
    Object.defineProperty(viewport, "scrollTo", {
      configurable: true,
      value: scrollToSpy,
    });

    useNpcDetectorStore.setState({
      latestDetectionAnimationCycle: 2,
    });

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 0,
        behavior: "smooth",
      });
    });
  });
});
