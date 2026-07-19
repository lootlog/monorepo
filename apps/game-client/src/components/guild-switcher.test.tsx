import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GuildIdentity } from "@/lib/api/generated-helpers";
import { useSettingsStore } from "@/store/settings.store";
import { GuildSwitcher } from "./guild-switcher";

const mockUseAccessibleGuilds = vi.fn();
const mockUseUserPreferences = vi.fn();
const runtime = vi.hoisted(() => ({ heroId: 123 as number | undefined }));

vi.mock("@/lib/api/generated/main/users/users", () => ({
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey: () => [
    "accessible-guilds",
  ],
  useUsersControllerGetCurrentUserAccessibleGuilds: () =>
    mockUseAccessibleGuilds(),
}));

vi.mock("@/hooks/api/use-user-preferences", () => ({
  useUserPreferences: () => mockUseUserPreferences(),
}));

vi.mock("@/lib/game", () => ({
  Game: {
    hero: {
      get id() {
        return runtime.heroId;
      },
    },
  },
}));

const createGuild = (id: string, name: string): GuildIdentity => ({
  id,
  name,
  icon: null,
});

describe("GuildSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtime.heroId = 123;
    useSettingsStore.setState({ guildIdByCharId: {} });

    mockUseAccessibleGuilds.mockReturnValue({
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

  it("does not initialize the global selection from an uncontrolled switcher", () => {
    render(<GuildSwitcher />);

    expect(useSettingsStore.getState().guildIdByCharId["123"]).toBeUndefined();
  });

  it("does not write a selection before the character identity is available", () => {
    runtime.heroId = undefined;
    render(<GuildSwitcher />);

    fireEvent.click(screen.getAllByRole("button")[0]);

    expect(useSettingsStore.getState().guildIdByCharId).toEqual({});
  });

  it("stores an explicitly clicked guild for the current character", () => {
    render(<GuildSwitcher />);

    fireEvent.click(screen.getAllByRole("button")[1]);

    expect(useSettingsStore.getState().guildIdByCharId).toEqual({
      "123": "guild-2",
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

    if (!(viewport instanceof HTMLDivElement)) {
      throw new Error("Expected scroll area viewport");
    }

    Object.defineProperty(viewport, "scrollLeft", {
      configurable: true,
      value: 0,
      writable: true,
    });

    const wheelEvent = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: 48,
    });

    viewport.dispatchEvent(wheelEvent);

    expect(wheelEvent.defaultPrevented).toBe(true);
    expect(viewport.scrollLeft).toBe(48);
  });

  it("renders unread badges for guilds and clamps them to 9+", () => {
    render(
      <GuildSwitcher
        allowAll
        value="guild-3"
        unreadCountByGuildId={{
          "guild-1": 3,
          "guild-2": 14,
        }}
      />,
    );

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("9+")).toBeInTheDocument();
  });
});
