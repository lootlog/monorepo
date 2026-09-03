import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GuildIdentity } from "@/lib/api/generated-helpers";
import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";
import { WorldSelector } from "./world-selector";

const mockUseAccessibleGuilds = vi.fn();
const mockUseUserPreferences = vi.fn();

vi.mock("@lootlog/client/main", async () => ({
  ...(await vi.importActual("@lootlog/client/main")),
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey: () => [
    "accessible-guilds",
  ],
  useUsersControllerGetCurrentUserAccessibleGuilds: () =>
    mockUseAccessibleGuilds(),
  getGuildsControllerGetWorldsByGuildIdQueryKey: () => ["guild-worlds"],
  useGuildsControllerGetWorldsByGuildId: () => ({
    data: ["tempest"],
    isFetched: true,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/api/use-user-preferences", () => ({
  useUserPreferences: () => mockUseUserPreferences(),
}));

vi.mock("@/hooks/use-local-storage", () => ({
  useLocalStorage: () => [[], vi.fn(), vi.fn()],
}));

vi.mock("@/components/ui/combobox", () => ({
  Combobox: () => <div role="combobox">Wybierz świat</div>,
}));

const guild: GuildIdentity = {
  id: "guild-1",
  name: "Alpha",
  icon: null,
};

describe("WorldSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "1",
        characterId: "123",
        currentHp: 1,
        icon: "hero.gif",
        level: 300,
        maxHp: 1,
        name: "Hero",
        profession: "w",
        x: 1,
        y: 2,
      },
      interface: "ni",
      map: { id: 1, name: "Map", visibility: 30 },
      world: "tempest",
    });
    useSettingsStore.setState({
      guildIdByCharId: { "123": "guild-1" },
      worldByGuildId: { "guild-1": "tempest" },
    });
    mockUseAccessibleGuilds.mockReturnValue({
      data: [guild],
      isFetched: true,
    });
    mockUseUserPreferences.mockReturnValue({
      data: {
        guildsOrder: [],
        hiddenGuildIds: [],
      },
      isFetched: true,
    });
  });

  it("renders when the selected guild is visible", () => {
    render(<WorldSelector />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("does not render when every accessible guild is hidden", () => {
    mockUseUserPreferences.mockReturnValue({
      data: {
        guildsOrder: [],
        hiddenGuildIds: ["guild-1"],
      },
      isFetched: true,
    });

    render(<WorldSelector />);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
