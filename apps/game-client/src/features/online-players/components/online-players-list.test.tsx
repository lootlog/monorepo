import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnlinePlayersList } from "./online-players-list";
import { useOnlinePlayersStore } from "@/store/online-players.store";

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
      "allowed",
    ]);

    useOnlinePlayersStore.setState({
      viewMode: "accounts",
      filtersVisible: true,
      filtersByGuildId: {},
    });
  });

  it("renders account entries with locations in accounts view", () => {
    render(<OnlinePlayersList viewMode="accounts" filtersVisible />);

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
      "allowed",
    ]);

    render(<OnlinePlayersList viewMode="accounts" filtersVisible />);

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
      "allowed",
    ]);

    render(<OnlinePlayersList viewMode="members" filtersVisible />);

    const highMemberEntry = screen.getByText("(1) High Member");
    const lowMemberEntry = screen.getByText("(1) Low Member");

    expect(
      highMemberEntry.compareDocumentPosition(lowMemberEntry) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows warning icon for afk characters in members view", () => {
    mockUsePlayersPresence.mockReturnValue([
      {
        "discord-1": [
          {
            discordId: "discord-1",
            guildId: "guild-1",
            platform: "game",
            isAfk: true,
            player: {
              world: "pandora",
              name: "Afk Hero",
              lvl: 123,
              icon: "hero.gif",
              characterId: "10",
              accountId: "20",
              prof: "w",
            },
          },
        ],
      },
      false,
      vi.fn(),
      "allowed",
    ]);

    const { container } = render(
      <OnlinePlayersList viewMode="members" filtersVisible />,
    );

    expect(container.querySelector(".lucide-triangle-alert")).not.toBeNull();
  });

  it("filters account entries by location", () => {
    render(<OnlinePlayersList viewMode="accounts" filtersVisible />);

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
    render(<OnlinePlayersList viewMode="accounts" filtersVisible />);

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

  it("stores level filters separately for each guild", () => {
    const { rerender } = render(
      <OnlinePlayersList viewMode="accounts" filtersVisible />,
    );

    fireEvent.change(screen.getByLabelText("Minimalny poziom"), {
      target: {
        value: "100",
      },
    });

    expect(screen.getByText("Hero (123w)")).toBeVisible();
    expect(screen.queryByText("Scout (80h)")).not.toBeInTheDocument();
    expect(useOnlinePlayersStore.getState().filtersByGuildId).toMatchObject({
      "guild-1": {
        minLvl: 100,
        maxLvl: 500,
        selectedProfession: "all",
      },
    });

    mockUseSettingsStore.mockReturnValue({
      allowWorldSelection: false,
      guildIdByCharId: {
        "10": "guild-2",
      },
      worldByGuildId: {
        "guild-2": "pandora",
      },
    });

    rerender(<OnlinePlayersList viewMode="accounts" filtersVisible />);

    expect(screen.getByLabelText("Minimalny poziom")).toHaveValue(0);
    expect(screen.getByText("Hero (123w)")).toBeVisible();
    expect(screen.getByText("Scout (80h)")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Maksymalny poziom"), {
      target: {
        value: "90",
      },
    });

    expect(useOnlinePlayersStore.getState().filtersByGuildId).toMatchObject({
      "guild-1": {
        minLvl: 100,
        maxLvl: 500,
        selectedProfession: "all",
      },
      "guild-2": {
        minLvl: 0,
        maxLvl: 90,
        selectedProfession: "all",
      },
    });
  });

  it("filters account entries by profession", async () => {
    const user = userEvent.setup();

    render(<OnlinePlayersList viewMode="accounts" filtersVisible />);

    await user.click(screen.getByLabelText("Profesja"));
    await user.click(await screen.findByText("Łowca"));

    expect(screen.queryByText("Hero (123w)")).not.toBeInTheDocument();
    expect(screen.getByText("Scout (80h)")).toBeVisible();
  });

  it("filters member entries when none of member characters match filters", () => {
    render(<OnlinePlayersList viewMode="members" filtersVisible />);

    expect(screen.getByText("(2) Discord User")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Minimalny poziom"), {
      target: {
        value: "200",
      },
    });

    expect(screen.queryByText("(2) Discord User")).not.toBeInTheDocument();
    expect(screen.getByText("Brak graczy online.")).toBeVisible();
  });

  it("hides guild, world and filters controls when filters are hidden", () => {
    mockUseSettingsStore.mockReturnValue({
      allowWorldSelection: true,
      guildIdByCharId: {
        "10": "guild-1",
      },
      worldByGuildId: {
        "guild-1": "pandora",
      },
    });

    render(<OnlinePlayersList viewMode="accounts" filtersVisible={false} />);

    expect(screen.queryByText("GuildSwitcher")).not.toBeInTheDocument();
    expect(screen.queryByText("WorldSelector")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Szukaj/)).not.toBeInTheDocument();
    expect(screen.getByText("Hero (123w)")).toBeVisible();
  });

  it("shows no access feedback when online players permission is missing", () => {
    mockUsePlayersPresence.mockReturnValue([{}, false, vi.fn(), "forbidden"]);

    render(<OnlinePlayersList viewMode="accounts" filtersVisible />);

    expect(
      screen.getByText(
        "Nie masz uprawnień do wyświetlania graczy online na tym serwerze.",
      ),
    ).toBeVisible();
    expect(screen.queryByText("Brak graczy online.")).not.toBeInTheDocument();
  });
});
