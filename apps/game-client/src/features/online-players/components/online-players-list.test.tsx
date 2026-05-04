import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnlinePlayersList } from "./online-players-list";

const mockUsePlayersPresence = vi.fn();
const mockUseGuildMembersSummary = vi.fn();
const mockUseSettingsStore = vi.fn();
const mockUseMemberInvalidation = vi.fn();

vi.mock("@/components/guild-switcher", () => ({
  GuildSwitcher: () => <div>GuildSwitcher</div>,
}));

vi.mock("@/components/world-selector", () => ({
  WorldSelector: () => <div>WorldSelector</div>,
}));

vi.mock("@/features/online-players/hooks/use-players-presence", () => ({
  usePlayersPresence: (...args: unknown[]) => mockUsePlayersPresence(...args),
}));

vi.mock("@/hooks/api/guild-members-summary-query", () => ({
  useGuildMembersSummary: (...args: unknown[]) =>
    mockUseGuildMembersSummary(...args),
}));

vi.mock("@/hooks/api/use-member-invalidation", () => ({
  useMemberInvalidation: (...args: unknown[]) =>
    mockUseMemberInvalidation(...args),
}));

vi.mock("@/store/settings.store", () => ({
  useSettingsStore: () => mockUseSettingsStore(),
}));

vi.mock("@/lib/game", () => ({
  Game: {
    hero: {
      id: 10,
    },
    getWorldName: () => "pandora",
  },
}));

describe("OnlinePlayersList", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSettingsStore.mockReturnValue({
      allowWorldSelection: false,
      guildIdByCharId: {
        "10": "guild-1",
      },
      worldByGuildId: {
        "guild-1": "pandora",
      },
    });

    mockUseGuildMembersSummary.mockReturnValue({
      data: {
        "discord-1": {
          id: "discord-1",
          name: "Discord User",
        },
      },
    });

    mockUsePlayersPresence.mockReturnValue([
      {
        "discord-1": [
          {
            discordId: "discord-1",
            guildId: "guild-1",
            platform: "game",
            mapName: "Ithan",
            player: {
              world: "pandora",
              name: "Hero",
              lvl: 123,
              icon: "hero.gif",
              characterId: "10",
              accountId: "20",
              prof: "w",
              location: {
                map: "Karka-han",
              },
            },
          },
          {
            discordId: "discord-1",
            guildId: "guild-1",
            platform: "game",
            mapName: "Torneg",
            player: {
              world: "pandora",
              name: "Scout",
              lvl: 80,
              icon: "scout.gif",
              characterId: "11",
              accountId: "21",
              prof: "h",
              location: {
                map: "Torneg",
              },
            },
          },
        ],
      },
      false,
      vi.fn(),
    ]);
  });

  it("renders account entries with locations in accounts view", () => {
    render(<OnlinePlayersList viewMode="accounts" />);

    expect(screen.getByText("Hero (123w)")).toBeVisible();
    expect(screen.getByText("Karka-han • pandora")).toBeVisible();
    expect(screen.getByText("Scout (80h)")).toBeVisible();
    expect(screen.queryByText("Discord User")).not.toBeInTheDocument();
  });

  it("renders account entries sorted by level descending", () => {
    mockUsePlayersPresence.mockReturnValue([
      {
        "discord-1": [
          {
            discordId: "discord-1",
            guildId: "guild-1",
            platform: "game",
            player: {
              world: "pandora",
              name: "Low",
              lvl: 80,
              icon: "low.gif",
              characterId: "80",
              accountId: "80",
              prof: "h",
            },
          },
        ],
        "discord-2": [
          {
            discordId: "discord-2",
            guildId: "guild-1",
            platform: "game",
            player: {
              world: "pandora",
              name: "High",
              lvl: 300,
              icon: "high.gif",
              characterId: "300",
              accountId: "300",
              prof: "w",
            },
          },
        ],
      },
      false,
      vi.fn(),
    ]);

    render(<OnlinePlayersList viewMode="accounts" />);

    const highEntry = screen.getByText("High (300w)");
    const lowEntry = screen.getByText("Low (80h)");

    expect(
      highEntry.compareDocumentPosition(lowEntry) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders member entries sorted by highest visible character level", () => {
    mockUseGuildMembersSummary.mockReturnValue({
      data: {
        "discord-low": {
          id: "discord-low",
          name: "Low Member",
        },
        "discord-high": {
          id: "discord-high",
          name: "High Member",
        },
      },
    });
    mockUsePlayersPresence.mockReturnValue([
      {
        "discord-low": [
          {
            discordId: "discord-low",
            guildId: "guild-1",
            platform: "game",
            player: {
              world: "pandora",
              name: "Low",
              lvl: 80,
              icon: "low.gif",
              characterId: "80",
              accountId: "80",
              prof: "h",
            },
          },
        ],
        "discord-high": [
          {
            discordId: "discord-high",
            guildId: "guild-1",
            platform: "game",
            player: {
              world: "pandora",
              name: "High",
              lvl: 300,
              icon: "high.gif",
              characterId: "300",
              accountId: "300",
              prof: "w",
            },
          },
        ],
      },
      false,
      vi.fn(),
    ]);

    render(<OnlinePlayersList viewMode="members" />);

    const highMemberEntry = screen.getByText("(1) High Member");
    const lowMemberEntry = screen.getByText("(1) Low Member");

    expect(
      highMemberEntry.compareDocumentPosition(lowMemberEntry) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("filters account entries by location", () => {
    render(<OnlinePlayersList viewMode="accounts" />);

    fireEvent.change(screen.getByPlaceholderText(/Szukaj/), {
      target: {
        value: "karka",
      },
    });

    expect(screen.getByText("Hero (123w)")).toBeVisible();

    fireEvent.change(screen.getByPlaceholderText(/Szukaj/), {
      target: {
        value: "werbin",
      },
    });

    expect(screen.queryByText("Hero (123w)")).not.toBeInTheDocument();
    expect(screen.getByText("Nie znaleziono graczy")).toBeVisible();
  });

  it("filters account entries by level range and keeps min lower than max", () => {
    render(<OnlinePlayersList viewMode="accounts" />);

    fireEvent.change(screen.getByLabelText("Minimalny poziom"), {
      target: {
        value: "100",
      },
    });

    expect(screen.getByText("Hero (123w)")).toBeVisible();
    expect(screen.queryByText("Scout (80h)")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Maksymalny poziom"), {
      target: {
        value: "90",
      },
    });

    expect(screen.getByLabelText("Minimalny poziom")).toHaveValue(90);
    expect(screen.getByLabelText("Maksymalny poziom")).toHaveValue(90);
  });

  it("filters account entries by profession", async () => {
    const user = userEvent.setup();

    render(<OnlinePlayersList viewMode="accounts" />);

    await user.click(screen.getByLabelText("Profesja"));
    await user.click(await screen.findByText("Łowca"));

    expect(screen.queryByText("Hero (123w)")).not.toBeInTheDocument();
    expect(screen.getByText("Scout (80h)")).toBeVisible();
  });

  it("filters member entries when none of member characters match filters", () => {
    render(<OnlinePlayersList viewMode="members" />);

    expect(screen.getByText("(2) Discord User")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Minimalny poziom"), {
      target: {
        value: "200",
      },
    });

    expect(screen.queryByText("(2) Discord User")).not.toBeInTheDocument();
    expect(screen.getByText("Brak graczy online.")).toBeVisible();
  });
});
