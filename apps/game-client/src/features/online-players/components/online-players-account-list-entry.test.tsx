import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerPresence } from "@/lib/online-players-presence";
import { OnlinePlayersAccountListEntry } from "./online-players-account-list-entry";

const mockGame = vi.hoisted(() => ({
  hero: {
    id: 999,
    nick: "Own Hero",
    clan: undefined as { id: number; name: string; rank: number } | undefined,
  },
  interface: "ni",
}));
const mockPartyMembers = vi.hoisted(() => ({
  members: [] as { id: number }[],
}));
const mockFriends = vi.hoisted(() => ({
  friends: [] as string[],
}));

vi.mock("@/lib/game", () => ({
  Game: mockGame,
}));

vi.mock("@/store/party.store", () => ({
  usePartyStore: (
    selector: (state: { members: { id: number }[] }) => unknown,
  ) => selector({ members: mockPartyMembers.members }),
}));

vi.mock("@/store/friends.store", () => ({
  useFriendsStore: (
    selector: (state: {
      isFriend: (characterId: string) => boolean;
    }) => unknown,
  ) =>
    selector({
      isFriend: (characterId) => mockFriends.friends.includes(characterId),
    }),
}));

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

  return tile as Element;
};

describe("OnlinePlayersAccountListEntry", () => {
  const showEquipmentSpy = vi.fn();
  const showProfileSpy = vi.fn();
  const inviteToPartySpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    window._g = inviteToPartySpy;
    window.Engine = {
      showEqManager: {
        update: showEquipmentSpy,
      },
      iframeWindowManager: {
        newPlayerProfile: showProfileSpy,
      },
    } as never;

    mockGame.hero.id = 999;
    mockGame.hero.nick = "Own Hero";
    mockGame.hero.clan = undefined;
    mockGame.interface = "ni";
    mockPartyMembers.members = [];
    mockFriends.friends = [];
  });

  it("renders player name and location from player location", () => {
    render(
      <OnlinePlayersAccountListEntry
        presence={createPresence()}
        guildMember={{ id: "discord-1", name: "Discord User" } as never}
      />,
    );

    expect(screen.getByText("Hero (123w)")).toBeVisible();
    expect(screen.getByText("Karka-han • pandora")).toBeVisible();
    expect(screen.queryByText("Discord User")).not.toBeInTheDocument();
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
        guildMember={{ id: "discord-1", name: "Discord User" } as never}
      />,
    );

    const tile = getAccountTile(container);

    await user.hover(tile);

    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Discord User",
    );
  });

  it("shows double click invite hint in the tile tooltip when player can be invited", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <OnlinePlayersAccountListEntry
        presence={createPresence()}
        guildMember={{ id: "discord-1", name: "Discord User" } as never}
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
    mockPartyMembers.members = [{ id: 10 }];

    const { container } = render(
      <OnlinePlayersAccountListEntry presence={createPresence()} />,
    );

    expect(container.querySelector(".ll\\:border-purple-400")).not.toBeNull();
    expect(screen.queryByTitle("Zaproś do drużyny")).not.toBeInTheDocument();
  });

  it("does not invite party members on tile double click", () => {
    mockPartyMembers.members = [{ id: 10 }];

    const { container } = render(
      <OnlinePlayersAccountListEntry presence={createPresence()} />,
    );
    const tile = getAccountTile(container);

    fireEvent.doubleClick(tile);

    expect(inviteToPartySpy).not.toHaveBeenCalled();
  });

  it("prioritizes self highlight over party and clan highlights", () => {
    mockGame.hero.id = 10;
    mockGame.hero.nick = "Hero";
    mockGame.hero.clan = {
      id: 15191,
      name: "Karhu",
      rank: 100,
    };
    mockPartyMembers.members = [{ id: 10 }];

    const { container } = render(
      <OnlinePlayersAccountListEntry presence={createPresence()} />,
    );

    expect(container.querySelector(".ll\\:border-yellow-400")).not.toBeNull();
    expect(container.querySelector(".ll\\:border-purple-400")).toBeNull();
    expect(container.querySelector(".ll\\:border-green-500")).toBeNull();
    expect(screen.queryByTitle("Zaproś do drużyny")).not.toBeInTheDocument();
  });

  it("does not invite the current player on tile double click", () => {
    mockGame.hero.id = 10;
    mockGame.hero.nick = "Hero";

    const { container } = render(
      <OnlinePlayersAccountListEntry presence={createPresence()} />,
    );
    const tile = getAccountTile(container);

    fireEvent.doubleClick(tile);

    expect(inviteToPartySpy).not.toHaveBeenCalled();
  });

  it("highlights same clan players when they are not self or party members", () => {
    mockGame.hero.clan = {
      id: 15191,
      name: "Karhu",
      rank: 100,
    };

    const { container } = render(
      <OnlinePlayersAccountListEntry presence={createPresence()} />,
    );

    expect(container.querySelector(".ll\\:border-green-500")).not.toBeNull();
    expect(screen.getByTitle("Zaproś do drużyny")).toBeVisible();
  });

  it("highlights afk players with orange and shows warning icon", () => {
    mockGame.hero.clan = {
      id: 15191,
      name: "Karhu",
      rank: 100,
    };

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
    mockGame.hero.id = 10;
    mockGame.hero.nick = "Hero";

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
    mockFriends.friends = ["10"];

    render(<OnlinePlayersAccountListEntry presence={createPresence()} />);

    fireEvent.contextMenu(screen.getByText("Hero (123w)"));

    await screen.findByText("Pokaż profil");

    expect(screen.queryByText("Dodaj do znajomych")).not.toBeInTheDocument();
  });
});
