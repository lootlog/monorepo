import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Guild } from "@/api";
import { GuildSwitcher } from "./guild-switcher";

const mockUseGuilds = vi.fn();
const mockUseUserPreferences = vi.fn();

vi.mock("@/hooks/api/use-guilds", () => ({
  useGuilds: () => mockUseGuilds(),
}));

vi.mock("@/hooks/api/use-user-preferences", () => ({
  useUserPreferences: () => mockUseUserPreferences(),
}));

vi.mock("@/lib/game", () => ({
  Game: {
    hero: {
      id: 123,
    },
  },
}));

const createGuild = (id: string, name: string): Guild => ({
  id,
  name,
  icon: null,
});

describe("GuildSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGuilds.mockReturnValue({
      data: [
        createGuild("guild-1", "Alpha"),
        createGuild("guild-2", "Beta"),
        createGuild("guild-3", "Gamma"),
      ],
      isFetched: true,
    });
    mockUseUserPreferences.mockReturnValue({
      data: {
        guildsOrder: [],
      },
    });
  });

  it("renders guilds in the user preferences order and appends missing guilds", () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        guildsOrder: ["guild-2", "guild-1"],
      },
    });

    render(<GuildSwitcher />);

    expect(
      screen.getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["B", "A", "G"]);
  });

  it("falls back to the first ordered guild when the current selection is missing", async () => {
    const handleChange = vi.fn();

    mockUseUserPreferences.mockReturnValue({
      data: {
        guildsOrder: ["guild-2", "guild-1"],
      },
    });

    render(<GuildSwitcher value="missing-guild" onChange={handleChange} />);

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith("guild-2");
    });
  });

  it("scrolls horizontally when the user uses the mouse wheel", () => {
    const { container } = render(<GuildSwitcher />);
    const viewport = container.querySelector(
      "[data-radix-scroll-area-viewport]",
    );

    expect(viewport).not.toBeNull();

    Object.defineProperty(viewport, "scrollLeft", {
      configurable: true,
      value: 0,
      writable: true,
    });

    fireEvent.wheel(viewport as HTMLElement, { deltaY: 48 });

    expect((viewport as HTMLElement).scrollLeft).toBe(48);
  });
});
