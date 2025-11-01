import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { NpcType } from "@/hooks/api/use-npcs";
import { TimersGrid } from "./timers-grid";
import { createMockTimerWithTimeLeft } from "../__tests__/test-helpers";

vi.mock("./single-timer", () => ({
  SingleTimer: ({ timer }: { timer: TimerWithTimeLeft }) => (
    <div data-testid={`timer-${timer.npc.id}`}>{timer.npc.name}</div>
  ),
}));

describe("TimersGrid", () => {
  const mockTimers: TimerWithTimeLeft[] = [
    createMockTimerWithTimeLeft({
      npcId: 1,
      guildId: "guild1",
      npc: {
        id: 1,
        name: "Dragon Boss",
        type: NpcType.HERO,
        lvl: 100,
        prof: "warrior",
        icon: "icon.png",
        wt: 1,
        margonemType: 1,
      },
      maxTimeLeft: 10000,
      minTimeLeft: 5000,
    }),
    createMockTimerWithTimeLeft({
      npcId: 2,
      guildId: "guild1",
      npc: {
        id: 2,
        name: "Orc Elite",
        type: NpcType.ELITE,
        lvl: 50,
        prof: "warrior",
        icon: "icon.png",
        wt: 1,
        margonemType: 1,
      },
      maxTimeLeft: 20000,
      minTimeLeft: 10000,
    }),
  ];

  it("should render all timers", () => {
    const { getByTestId } = render(
      <TimersGrid
        timers={mockTimers}
        settingsKey="guild1"
        hiddenTimers={[]}
        minColumnWidth={200}
      />,
    );

    expect(getByTestId("timer-1")).toBeDefined();
    expect(getByTestId("timer-2")).toBeDefined();
  });

  it("should apply grid template columns style", () => {
    const { container } = render(
      <TimersGrid
        timers={mockTimers}
        settingsKey="guild1"
        hiddenTimers={[]}
        minColumnWidth={250}
      />,
    );

    const gridElement = container.querySelector(
      'span[style*="grid-template-columns"]',
    );
    expect(gridElement?.getAttribute("style")).toContain(
      "repeat(auto-fit, minmax(250px, 1fr))",
    );
  });

  it("should render empty grid when no timers", () => {
    const { container } = render(
      <TimersGrid
        timers={[]}
        settingsKey="guild1"
        hiddenTimers={[]}
        minColumnWidth={200}
      />,
    );

    const gridElement = container.querySelector(".ll\\:grid");
    expect(gridElement?.children.length).toBe(0);
  });

  it("should pass correct props to SingleTimer", () => {
    const { getByTestId } = render(
      <TimersGrid
        timers={mockTimers}
        settingsKey="guild1"
        hiddenTimers={["Dragon Boss"]}
        minColumnWidth={200}
      />,
    );

    expect(getByTestId("timer-1")).toBeDefined();
  });
});
