import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServerVisibilitySettingsTab } from "./server-visibility-settings-tab";
import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";

const mockUpdatePreferences = vi.fn();

vi.mock("@lootlog/client/main", async () => ({
  ...(await vi.importActual("@lootlog/client/main")),
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey: () => [
    "accessible-guilds",
  ],
  useUsersControllerGetCurrentUserAccessibleGuilds: () => ({
    data: [
      { id: "guild-1", name: "Alpha", icon: null },
      {
        id: "guild-2",
        name: "Beta",
        icon: "https://cdn.discordapp.com/icons/guild-2/beta.png",
      },
      { id: "guild-3", name: "Gamma", icon: null },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/api/use-user-preferences", () => ({
  useUserPreferences: () => ({
    data: {
      guildsOrder: ["guild-2", "guild-1"],
      hiddenGuildIds: ["guild-2", "temporarily-unavailable"],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdateUserPreferences: () => ({
    mutate: mockUpdatePreferences,
    isPending: false,
    isSuccess: false,
    isError: false,
  }),
}));

describe("ServerVisibilitySettingsTab", () => {
  beforeEach(() => {
    mockUpdatePreferences.mockReset();
    useGameStore.getState().clearGame();
    useSettingsStore.setState({
      guildIdByCharId: {},
      presenceOrganizationIdsByCharId: {},
    });
  });

  it("shows ordered guilds with avatars and visibility counts", () => {
    render(<ServerVisibilitySettingsTab />);

    expect(screen.getByText("2 widoczne")).toBeInTheDocument();
    expect(screen.getByText("1 ukryty")).toBeInTheDocument();
    expect(screen.getByAltText("Beta")).toHaveAttribute(
      "src",
      "https://cdn.discordapp.com/icons/guild-2/beta.png",
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("switch")
        .map((control) => control.getAttribute("aria-label")),
    ).toEqual([
      "Pokaż Beta w grze",
      "Pokaż Alpha w grze",
      "Pokaż Gamma w grze",
      "Publikuj obecność w organizacji Beta",
      "Publikuj obecność w organizacji Alpha",
      "Publikuj obecność w organizacji Gamma",
    ]);
  });

  it("uses the full section width for search", () => {
    render(<ServerVisibilitySettingsTab />);

    expect(screen.getByRole("search")).toHaveClass("ll:w-full");
  });

  it("filters hidden guilds and searches by name", () => {
    render(<ServerVisibilitySettingsTab />);

    fireEvent.click(screen.getByRole("button", { name: "Ukryte" }));
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Wszystkie" }));
    fireEvent.change(screen.getByPlaceholderText("Szukaj serwera"), {
      target: { value: "gamma" },
    });
    expect(screen.getByText("Gamma")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("saves the full hidden guild snapshot", () => {
    render(<ServerVisibilitySettingsTab />);

    fireEvent.click(
      screen.getByRole("switch", {
        name: "Pokaż Alpha w grze",
      }),
    );

    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      hiddenGuildIds: ["guild-2", "temporarily-unavailable", "guild-1"],
    });
  });

  it("shows every guild with one reset action", () => {
    render(<ServerVisibilitySettingsTab />);

    fireEvent.click(screen.getByRole("button", { name: "Pokaż wszystkie" }));

    expect(mockUpdatePreferences).toHaveBeenCalledWith({
      hiddenGuildIds: ["temporarily-unavailable"],
    });
  });

  it("shows the active character's default presence organization as enabled", () => {
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "20",
        characterId: "10",
        clan: { id: 30, name: "Clan", rank: 1 },
        currentHp: 100,
        icon: "hero.gif",
        level: 100,
        maxHp: 100,
        name: "Hero",
        profession: "w",
        x: 1,
        y: 2,
      },
      interface: "ni",
      map: { id: 100, name: "Karka-han", visibility: 0 },
      world: "alpha",
    });
    useSettingsStore.setState({
      guildIdByCharId: { "10": "guild-1" },
      presenceDefaultOrganizationIdByClanKey: { "alpha:30": "guild-1" },
    });

    render(<ServerVisibilitySettingsTab />);

    expect(
      screen.getByRole("switch", {
        name: "Publikuj obecność w organizacji Alpha",
      }),
    ).toBeChecked();
  });
});
