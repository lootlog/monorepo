import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Timer } from "@/hooks/api/use-timers";
import type { Guild } from "@/hooks/api/use-guild";
import { NpcType } from "@/hooks/api/use-npcs";
import { TimerTooltip } from "./timer-tooltip";
import { createMockTimer } from "../__tests__/test-helpers";

describe("TimerTooltip", () => {
  const mockTimer = createMockTimer();

  const mockGuilds: Guild[] = [
    { id: "guild1", name: "Test Guild" } as Guild,
    { id: "guild2", name: "Another Guild" } as Guild,
  ];

  it("should render NPC name with level suffix", () => {
    render(<TimerTooltip timer={mockTimer} guilds={mockGuilds} />);

    expect(screen.getByText(/Dragon Boss/)).toBeDefined();
    expect(screen.getByText(/ \(100w\)/)).toBeDefined();
  });

  it("should render member names with guild names", () => {
    const timerWithMembers = createMockTimer({
      members: [
        {
          id: 1,
          name: "Player1",
          guildId: "guild1",
          userId: "user1",
          type: "member",
        },
        {
          id: 2,
          name: "Player2",
          guildId: "guild2",
          userId: "user2",
          type: "member",
        },
      ],
    });

    render(<TimerTooltip timer={timerWithMembers} guilds={mockGuilds} />);

    expect(screen.getByText("Dodane przez:")).toBeDefined();
    expect(
      screen.getByText(/Player1 \(Test Guild\), Player2 \(Another Guild\)/),
    ).toBeDefined();
  });

  it("should show reset indicator when timer was reset", () => {
    const resetTimer = createMockTimer({ wasReset: true });
    render(<TimerTooltip timer={resetTimer} guilds={mockGuilds} />);

    expect(screen.getByText("⟳ Timer został zresetowany")).toBeDefined();
  });

  it("should not show reset indicator when timer was not reset", () => {
    render(<TimerTooltip timer={mockTimer} guilds={mockGuilds} />);

    expect(screen.queryByText("⟳ Timer został zresetowany")).toBeNull();
  });

  it("should render min and max spawn times", () => {
    render(<TimerTooltip timer={mockTimer} guilds={mockGuilds} />);

    expect(screen.getByText("Min:")).toBeDefined();
    expect(screen.getByText("Max:")).toBeDefined();
    expect(screen.getByText(/01\.01\.2024 - 10:00:00/)).toBeDefined();
    expect(screen.getByText(/01\.01\.2024 - 12:00:00/)).toBeDefined();
  });

  it("should render creation date when updatedAt is provided", () => {
    render(<TimerTooltip timer={mockTimer} guilds={mockGuilds} />);

    expect(screen.getByText("Dodano:")).toBeDefined();
    expect(screen.getByText(/01\.01\.2024 - 08:00:00/)).toBeDefined();
  });

  it("should not render members section when no members exist", () => {
    render(<TimerTooltip timer={mockTimer} guilds={mockGuilds} />);

    expect(screen.queryByText("Dodane przez:")).toBeNull();
  });

  it("should handle level 0 NPC without showing level suffix", () => {
    const timerWithLvl0 = createMockTimer({
      npc: {
        id: 1,
        name: "Dragon Boss",
        type: NpcType.HERO,
        lvl: 0,
        prof: "warrior",
        icon: "icon.png",
        wt: 1,
        margonemType: 1,
      },
    });

    render(<TimerTooltip timer={timerWithLvl0} guilds={mockGuilds} />);

    expect(screen.queryByText(/\(0/)).toBeNull();
  });
});
