import "@/index.css";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerPresence } from "@/lib/online-players-presence";
import {
  setTestRuntimeGame,
  testRuntimeWindow,
} from "@/test/test-runtime-window";
import { usePartyStore } from "@/store/party.store";
import { useFriendsStore } from "@/store/friends.store";
import type {
  showCharacterEquipment,
  showCharacterProfile,
} from "@/lib/margonem-runtime/adapters/character-action-runtime-adapter";
import { OnlinePlayersAccountListEntry } from "./online-players-account-list-entry";

const createPresence = (
  overrides?: Partial<PlayerPresence>,
): PlayerPresence => ({
  discordId: "discord-1",
  guildId: "guild-1",
  platform: "game",
  mapName: "Ithan",
  isAfk: false,
  player: {
    world: "pandora",
    name: "Hero",
    lvl: 123,
    icon: "hero.gif",
    characterId: "10",
    accountId: "20",
    prof: "w",
    clan: {
      id: 15191,
      name: "Karhu",
      rank: 100,
    },
    location: {
      map: "Karka-han",
    },
  },
  ...overrides,
});

const getAccountTile = (container: HTMLElement) => {
  const tile = container.querySelector(".ll\\:mb-0\\.5");

  expect(tile).not.toBeNull();

  if (!tile) throw new Error("Expected account tile");
  return tile;
};

const expectTooltipAboveWindows = (tooltip: HTMLElement) => {
  const tooltipPositioner = tooltip.parentElement;

  expect(tooltipPositioner).not.toBeNull();
  if (!tooltipPositioner) {
    throw new Error("Tooltip positioner was not rendered");
  }
  expect(getComputedStyle(tooltipPositioner).zIndex).toBe("500");
};

describe("OnlinePlayersAccountListEntry", () => {
  const showEquipmentSpy = vi.fn<typeof showCharacterEquipment>();
  const showProfileSpy = vi.fn<typeof showCharacterProfile>();
  const inviteToPartySpy = vi.fn<(command: string) => void>();

  beforeEach(() => {
    vi.clearAllMocks();

    testRuntimeWindow._g = inviteToPartySpy;
    testRuntimeWindow.Engine = {
      showEqManager: {
        update: showEquipmentSpy,
      },
      iframeWindowManager: {
        newPlayerProfile: showProfileSpy,
      },
    };

    setTestRuntimeGame({
      hero: {
        characterId: "999",
        clan: undefined,
        name: "Own Hero",
      },
      interface: "ni",
    });
    usePartyStore.getState().clearParty();
    useFriendsStore.getState().clearFriends();
  });

  it("renders player name and location from player location", () => {
    render(
      <OnlinePlayersAccountListEntry
        presence={createPresence()}
        guildMember={{ id: 1, userId: "discord-1", name: "Discord User" }}
      />,
    );

    expect(screen.getByText("Hero (123w)")).toBeVisible();
    expect(screen.getByText("Karka-han • pandora")).toBeVisible();
    expect(screen.queryByText("Discord User")).not.toBeInTheDocument();
  });

  it("uses the local map for the current player when gateway hides locations", () => {
    setTestRuntimeGame({
      hero: { characterId: "10", name: "Hero" },
      map: { id: 42, name: "Torneg", visibility: 30 },
    });
    const player = createPresence().player;

    render(
      <OnlinePlayersAccountListEntry
        presence={createPresence({
          mapName: undefined,
          player: player ? { ...player, location: undefined } : undefined,
        })}
      />,
    );

    expect(screen.getByText("Torneg • pandora")).toBeVisible();
  });

  it("shows Margonem verification only for verified presence", () => {
    const { rerender } = render(
      <OnlinePlayersAccountListEntry presence={createPresence()} />,
    );

    expect(
      screen.queryByLabelText("Zweryfikowane konto Margonem"),
    ).not.toBeInTheDocument();

    rerender(
      <OnlinePlayersAccountListEntry
        presence={createPresence({ margonemAccountVerified: true })}
      />,
    );

    expect(screen.getByLabelText("Zweryfikowane konto Margonem")).toBeVisible();
  });

  it("shows discord member name in a tooltip", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <OnlinePlayersAccountListEntry
        presence={createPresence()}
        guildMember={{ id: 1, userId: "discord-1", name: "Discord User" }}
      />,
    );

    const tile = getAccountTile(container);

    await user.hover(tile);

    const tooltip = await screen.findByRole("tooltip");

    expect(tooltip).toHaveTextContent("Discord User");
    expectTooltipAboveWindows(tooltip);
  });

  it("keeps the character tooltip above draggable windows", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <OnlinePlayersAccountListEntry presence={createPresence()} />,
    );
    const characterTrigger = container.querySelector<HTMLElement>(
      '[style*="hero.gif"]',
    );

    expect(characterTrigger).not.toBeNull();
    if (!characterTrigger) {
      throw new Error("Character tooltip trigger was not rendered");
    }
    await user.hover(characterTrigger);

    const tooltip = await screen.findByRole("tooltip");

    expect(tooltip).toHaveTextContent("Hero (123w)");
    expectTooltipAboveWindows(tooltip);
  });

  it("keeps the verified account tooltip above draggable windows", async () => {
    const user = userEvent.setup();

    render(
      <OnlinePlayersAccountListEntry
        presence={createPresence({ margonemAccountVerified: true })}
      />,
    );
    await user.hover(screen.getByLabelText("Zweryfikowane konto Margonem"));

    const tooltip = await screen.findByRole("tooltip");

    expect(tooltip).toHaveTextContent("Zweryfikowane konto Margonem");
    expectTooltipAboveWindows(tooltip);
  });

  it("shows double click invite hint in the tile tooltip when player can be invited", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <OnlinePlayersAccountListEntry
        presence={createPresence()}
        guildMember={{ id: 1, userId: "discord-1", name: "Discord User" }}
      />,
    );
    const tile = getAccountTile(container);

    await user.hover(tile);

    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Kliknij dwukrotnie, aby zaprosić do drużyny",
    );
  });

  it("falls back to presence map name when player location is missing", () => {
    render(
      <OnlinePlayersAccountListEntry
        presence={createPresence({
          player: {
            world: "pandora",
            name: "Hero",
            lvl: 123,
            icon: "hero.gif",
            characterId: "10",
            accountId: "20",
            prof: "w",
          },
        })}
      />,
    );

    expect(screen.getByText("Ithan • pandora")).toBeVisible();
  });

  it("invites the character to party from the right-side button", () => {
    render(<OnlinePlayersAccountListEntry presence={createPresence()} />);

    fireEvent.click(screen.getByTitle("Zaproś do drużyny"));

    expect(inviteToPartySpy).toHaveBeenCalledWith("party&a=inv&id=10");
  });

  it("invites the character to party on tile double click", () => {
    const { container } = render(
      <OnlinePlayersAccountListEntry presence={createPresence()} />,
    );
    const tile = getAccountTile(container);

    fireEvent.doubleClick(tile);

    expect(inviteToPartySpy).toHaveBeenCalledWith("party&a=inv&id=10");
  });

  it("highlights party members and hides invite action", () => {
    usePartyStore.getState().replaceParty([
      {
        characterId: "10",
        accountId: "20",
        currentHp: 100,
        maxHp: 100,
        icon: "hero.gif",
        isLeader: false,
        name: "Hero",
        profession: "w",
      },
    ]);

    const { container } = render(
      <OnlinePlayersAccountListEntry presence={createPresence()} />,
    );

    expect(container.querySelector(".ll\\:border-purple-400")).not.toBeNull();
    expect(screen.queryByTitle("Zaproś do drużyny")).not.toBeInTheDocument();
  });

  it("does not invite party members on tile double click", () => {
    usePartyStore.getState().replaceParty([
      {
        characterId: "10",
        accountId: "20",
        currentHp: 100,
        maxHp: 100,
        icon: "hero.gif",
        isLeader: false,
        name: "Hero",
        profession: "w",
      },
    ]);

    const { container } = render(
      <OnlinePlayersAccountListEntry presence={createPresence()} />,
    );
    const tile = getAccountTile(container);

    fireEvent.doubleClick(tile);

    expect(inviteToPartySpy).not.toHaveBeenCalled();
  });

  it("prioritizes self highlight over party and clan highlights", () => {
    usePartyStore.getState().replaceParty([
      {
        characterId: "10",
        accountId: "20",
        currentHp: 100,
        maxHp: 100,
        icon: "hero.gif",
        isLeader: false,
        name: "Hero",
        profession: "w",
      },
    ]);
    setTestRuntimeGame({
      hero: {
        characterId: "10",
        clan: { id: 15191, name: "Karhu", rank: 100 },
        name: "Hero",
      },
    });

    const { container } = render(
      <OnlinePlayersAccountListEntry presence={createPresence()} />,
    );

    expect(container.querySelector(".ll\\:border-yellow-400")).not.toBeNull();
    expect(container.querySelector(".ll\\:border-purple-400")).toBeNull();
    expect(container.querySelector(".ll\\:border-green-500")).toBeNull();
    expect(screen.queryByTitle("Zaproś do drużyny")).not.toBeInTheDocument();
  });

  it("does not invite the current player on tile double click", () => {
    setTestRuntimeGame({
      hero: { characterId: "10", name: "Hero" },
    });

    const { container } = render(
      <OnlinePlayersAccountListEntry presence={createPresence()} />,
    );
    const tile = getAccountTile(container);

    fireEvent.doubleClick(tile);

    expect(inviteToPartySpy).not.toHaveBeenCalled();
  });

  it("highlights same clan players when they are not self or party members", () => {
    setTestRuntimeGame({
      hero: {
        clan: { id: 15191, name: "Karhu", rank: 100 },
      },
    });

    const { container } = render(
      <OnlinePlayersAccountListEntry presence={createPresence()} />,
    );

    expect(container.querySelector(".ll\\:border-green-500")).not.toBeNull();
    expect(screen.getByTitle("Zaproś do drużyny")).toBeVisible();
  });

  it("highlights afk players with orange and shows warning icon", () => {
    setTestRuntimeGame({
      hero: {
        clan: { id: 15191, name: "Karhu", rank: 100 },
      },
    });

    const { container } = render(
      <OnlinePlayersAccountListEntry
        presence={createPresence({ isAfk: true })}
      />,
    );

    expect(container.querySelector(".ll\\:border-orange-500")).not.toBeNull();
    expect(container.querySelector(".ll\\:border-green-500")).toBeNull();
    expect(container.querySelector(".lucide-triangle-alert")).not.toBeNull();
  });

  it("keeps self highlight for afk current player and shows warning icon", () => {
    setTestRuntimeGame({
      hero: { characterId: "10", name: "Hero" },
    });

    const { container } = render(
      <OnlinePlayersAccountListEntry
        presence={createPresence({ isAfk: true })}
      />,
    );

    expect(container.querySelector(".ll\\:border-yellow-400")).not.toBeNull();
    expect(container.querySelector(".ll\\:border-orange-500")).toBeNull();
    expect(container.querySelector(".lucide-triangle-alert")).not.toBeNull();
  });

  it("opens game profile and equipment actions from the context menu", async () => {
    render(<OnlinePlayersAccountListEntry presence={createPresence()} />);

    fireEvent.contextMenu(screen.getByText("Hero (123w)"));

    fireEvent.click(await screen.findByText("Pokaż profil"));

    expect(showProfileSpy).toHaveBeenCalledWith({
      accountId: 20,
      characterId: 10,
    });

    fireEvent.contextMenu(screen.getByText("Hero (123w)"));
    fireEvent.click(await screen.findByText("Pokaż ekwipunek"));

    await waitFor(() => {
      expect(showEquipmentSpy).toHaveBeenCalledWith({
        id: 10,
        nick: "Hero",
        prof: "w",
        icon: "hero.gif",
        lvl: 123,
        account: 20,
      });
    });
  });

  it("adds the character to friends from the context menu", async () => {
    render(
      <OnlinePlayersAccountListEntry
        presence={createPresence({
          player: {
            world: "pandora",
            name: "Hero Name",
            lvl: 123,
            icon: "hero.gif",
            characterId: "10",
            accountId: "20",
            prof: "w",
          },
        })}
      />,
    );

    fireEvent.contextMenu(screen.getByText("Hero Name (123w)"));
    fireEvent.click(await screen.findByText("Dodaj do znajomych"));

    expect(inviteToPartySpy).toHaveBeenCalledWith(
      "friends&a=finvite&nick=Hero_Name",
    );
  });

  it("hides add friend context action for existing friends", async () => {
    useFriendsStore.getState().replaceFriends(
      [
        {
          characterId: "10",
          icon: "hero.gif",
          level: 123,
          location: "Ithan",
          name: "Hero",
          profession: "w",
          status: "online",
        },
      ],
      10,
    );

    render(<OnlinePlayersAccountListEntry presence={createPresence()} />);

    fireEvent.contextMenu(screen.getByText("Hero (123w)"));

    await screen.findByText("Pokaż profil");

    expect(screen.queryByText("Dodaj do znajomych")).not.toBeInTheDocument();
  });
});
