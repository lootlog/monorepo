import {
  act,
  fireEvent,
  render as renderUi,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import {
  getMembersControllerGetGuildMembersSummaryQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  type MemberSummaryResponseDtoOutput,
  type UserPreferencesResponseDtoOutput,
} from "@lootlog/client/main";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useSettingsStore } from "@/store/settings.store";
import { useOnlinePlayersStore } from "@/store/online-players.store";
import {
  createOnlinePlayersTest,
  createOnlinePresence,
  createPresenceSnapshot,
  type PresenceSnapshotData,
} from "../online-players-test-fixtures";
import { OnlinePlayersList } from "./online-players-list";

const person = (
  name: string,
  lvl: number,
  prof: string,
  characterId: string,
  discordId = "discord-1",
  map = "Karka-han",
) =>
  createOnlinePresence({
    discordId,
    sessionId: `session-${characterId}`,
    character: {
      world: "pandora",
      name,
      lvl,
      prof,
      characterId,
      accountId: characterId,
      icon: "hero.gif",
    },
    location: { map },
  });

const initialPresences = () => [
  person("Hero", 123, "w", "10"),
  person("Scout", 80, "h", "11", "discord-1", "Torneg"),
];

const preferences: UserPreferencesResponseDtoOutput = {
  userId: "user",
  guildsOrder: [],
  hiddenGuildIds: [],
  theme: "default",
  chatAppearance: CHAT_APPEARANCE_READABLE_PRESET,
  mutes: { players: [], npcs: [] },
};

describe("OnlinePlayersList", () => {
  let harness: ReturnType<typeof createOnlinePlayersTest>;
  beforeEach(() => {
    harness = createOnlinePlayersTest();
    setTestRuntimeGame({ hero: { characterId: "10" }, world: "pandora" });
    useSettingsStore.setState({
      allowWorldSelection: false,
      guildIdByCharId: { "10": "guild-1" },
      worldByGuildId: { "guild-1": "pandora", "guild-2": "pandora" },
    });
    useOnlinePlayersStore.setState(
      useOnlinePlayersStore.getInitialState(),
      true,
    );
    harness.queryClient.setQueryData(
      getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      [],
    );
    harness.queryClient.setQueryData(
      getUsersControllerGetUserPreferencesQueryKey(),
      preferences,
    );
    setMembers([{ id: 1, userId: "discord-1", name: "Discord User" }]);
    harness.fetchPresence.mockImplementation((organizationId) =>
      Promise.resolve({
        ...createPresenceSnapshot(initialPresences()),
        organizationId,
        world: "pandora",
      }),
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    useOnlinePlayersStore.setState(
      useOnlinePlayersStore.getInitialState(),
      true,
    );
  });

  const setMembers = (members: MemberSummaryResponseDtoOutput[]) => {
    for (const guildId of ["guild-1", "guild-2"])
      harness.queryClient.setQueryData(
        getMembersControllerGetGuildMembersSummaryQueryKey({ guildId }),
        members,
      );
  };

  const render = async (ui: ReactElement, waitForData = true) => {
    const view = renderUi(ui, { wrapper: harness.wrapper });
    harness.open();
    await harness.join(
      ["guild-1", "guild-2"],
      createAccessPolicySnapshot(
        ["guild-1", "guild-2"].map((id) => ({
          guild: { id, ownerId: "owner" },
          roles: [
            {
              permissions: [
                Permission.LOOTLOG_ONLINE_PLAYERS_READ,
                Permission.LOOTLOG_PRESENCE_LOCATION_READ,
              ],
              lvlRangeFrom: 0,
              lvlRangeTo: 500,
            },
          ],
        })),
        "user",
      ),
    );

    if (waitForData)
      await act(async () => {
        await Promise.resolve();
      });

    return view;
  };

  it("renders account entries with locations in accounts view", async () => {
    await render(<OnlinePlayersList viewMode="accounts" filtersVisible />);
    expect(await screen.findByText("Hero (123w)")).toBeVisible();
    expect(screen.getByText("Karka-han • pandora")).toBeVisible();
    expect(screen.getByText("Scout (80h)")).toBeVisible();
    expect(screen.queryByText("Discord User")).not.toBeInTheDocument();
  });

  it("shows a delayed spinner instead of an empty state while presence loads", async () => {
    vi.useFakeTimers();
    harness.fetchPresence.mockReturnValue(
      new Promise<PresenceSnapshotData>(() => {}),
    );
    await render(
      <OnlinePlayersList viewMode="accounts" filtersVisible />,
      false,
    );
    expect(
      screen.queryByText("Nikt nie jest teraz online"),
    ).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));
    expect(
      screen.getByRole("status", { busy: true }).querySelector("svg"),
    ).toHaveClass("ll:animate-spin");
  });

  it("allows retrying an initial presence acknowledgement timeout", async () => {
    vi.useFakeTimers();
    harness.fetchPresence.mockReturnValue(
      new Promise<PresenceSnapshotData>(() => {}),
    );
    await render(
      <OnlinePlayersList viewMode="accounts" filtersVisible />,
      false,
    );
    await act(() => vi.advanceTimersByTimeAsync(10000));
    expect(
      screen.getByRole("button", { name: "Spróbuj ponownie" }),
    ).toBeVisible();
    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot(initialPresences()),
    );
    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(harness.fetchPresence).toHaveBeenCalledTimes(3);
    expect(screen.getByText("Hero (123w)")).toBeVisible();
  });

  it("keeps long account names and locations constrained for truncation", async () => {
    const name = "Very long player name that must stay inside the list";
    const map = "Very long location name that must stay inside the list";
    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot([person(name, 123, "w", "10", "discord-1", map)]),
    );

    const { container } = await render(
      <OnlinePlayersList viewMode="accounts" filtersVisible />,
    );

    const playerName = await screen.findByText(`${name} (123w)`);
    const viewport = container.querySelector("[data-ll-scroll-area-viewport]");
    expect(viewport?.firstElementChild).toHaveStyle({
      width: "100%",
      minWidth: 0,
    });
    expect(playerName).toHaveClass("ll:truncate");
    expect(playerName.parentElement).toHaveClass("ll:min-w-0");
    expect(playerName.parentElement?.parentElement).toHaveClass("ll:min-w-0");
    expect(screen.getByText(`${map} • pandora`)).toHaveClass("ll:truncate");
  });

  it("renders account entries sorted by level descending", async () => {
    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot([
        person("Low", 80, "h", "80"),
        person("High", 300, "w", "300", "discord-2"),
      ]),
    );
    setMembers([
      { id: 1, userId: "discord-1", name: "First" },
      { id: 2, userId: "discord-2", name: "Second" },
    ]);
    await render(<OnlinePlayersList viewMode="accounts" filtersVisible />);
    const high = await screen.findByText("High (300w)");
    expect(
      high.compareDocumentPosition(screen.getByText("Low (80h)")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders member entries sorted by highest visible character level", async () => {
    setMembers([
      { id: 1, userId: "discord-low", name: "Low Member" },
      { id: 2, userId: "discord-high", name: "High Member" },
    ]);
    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot([
        person("Low", 80, "h", "80", "discord-low"),
        person("High", 300, "w", "300", "discord-high"),
      ]),
    );
    await render(<OnlinePlayersList viewMode="members" filtersVisible />);
    const high = await screen.findByText("(1) High Member");
    expect(
      high.compareDocumentPosition(screen.getByText("(1) Low Member")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows warning icon for afk characters in members view", async () => {
    harness.fetchPresence.mockResolvedValue(
      createPresenceSnapshot([
        { ...person("Afk Hero", 123, "w", "10"), isAfk: true },
      ]),
    );

    const { container } = await render(
      <OnlinePlayersList viewMode="members" filtersVisible />,
    );

    await screen.findByText("(1) Discord User");
    expect(container.querySelector(".lucide-triangle-alert")).not.toBeNull();
  });

  it("filters account entries by location", async () => {
    await render(<OnlinePlayersList viewMode="accounts" filtersVisible />);
    await screen.findByText("Hero (123w)");
    fireEvent.change(screen.getByPlaceholderText(/Szukaj/), {
      target: { value: "karka" },
    });
    expect(screen.getByText("Hero (123w)")).toBeVisible();
    fireEvent.change(screen.getByPlaceholderText(/Szukaj/), {
      target: { value: "werbin" },
    });
    expect(screen.queryByText("Hero (123w)")).not.toBeInTheDocument();
    expect(screen.getByText("Brak pasujących graczy")).toBeVisible();
  });

  it("clears all filters from the filtered empty state", async () => {
    const user = userEvent.setup();
    await render(<OnlinePlayersList viewMode="accounts" filtersVisible />);
    await screen.findByText("Hero (123w)");
    fireEvent.change(screen.getByPlaceholderText(/Szukaj/), {
      target: { value: "missing" },
    });
    fireEvent.change(screen.getByLabelText("Minimalny poziom"), {
      target: { value: "200" },
    });
    await user.click(screen.getByRole("button", { name: "Wyczyść filtry" }));
    expect(screen.getByPlaceholderText(/Szukaj/)).toHaveValue("");
    expect(screen.getByLabelText("Minimalny poziom")).toHaveValue(0);
    expect(screen.getByLabelText("Maksymalny poziom")).toHaveValue(500);
    expect(screen.getByText("Hero (123w)")).toBeVisible();
    expect(screen.getByText("Scout (80h)")).toBeVisible();
  });

  it("filters account entries by level range and keeps min lower than max", async () => {
    await render(<OnlinePlayersList viewMode="accounts" filtersVisible />);
    await screen.findByText("Hero (123w)");
    fireEvent.change(screen.getByLabelText("Minimalny poziom"), {
      target: { value: "100" },
    });
    expect(screen.getByText("Hero (123w)")).toBeVisible();
    expect(screen.queryByText("Scout (80h)")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Maksymalny poziom"), {
      target: { value: "90" },
    });
    expect(screen.getByLabelText("Minimalny poziom")).toHaveValue(90);
    expect(screen.getByLabelText("Maksymalny poziom")).toHaveValue(90);
  });

  it("stores level filters separately for each guild", async () => {
    await render(<OnlinePlayersList viewMode="accounts" filtersVisible />);
    await screen.findByText("Hero (123w)");
    fireEvent.change(screen.getByLabelText("Minimalny poziom"), {
      target: { value: "100" },
    });
    expect(screen.queryByText("Scout (80h)")).not.toBeInTheDocument();
    act(() =>
      useSettingsStore.setState({ guildIdByCharId: { "10": "guild-2" } }),
    );
    expect(screen.getByLabelText("Minimalny poziom")).toHaveValue(0);
    expect(await screen.findByText("Scout (80h)")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Maksymalny poziom"), {
      target: { value: "90" },
    });
    expect(useOnlinePlayersStore.getState().filtersByGuildId).toMatchObject({
      "guild-1": { minLvl: 100, maxLvl: 500, selectedProfession: "all" },
      "guild-2": { minLvl: 0, maxLvl: 90, selectedProfession: "all" },
    });
  });

  it("filters account entries by profession", async () => {
    const user = userEvent.setup();
    await render(<OnlinePlayersList viewMode="accounts" filtersVisible />);
    await screen.findByText("Hero (123w)");
    await user.click(screen.getByLabelText("Profesja"));
    await user.click(await screen.findByText("Łowca"));
    expect(screen.queryByText("Hero (123w)")).not.toBeInTheDocument();
    expect(screen.getByText("Scout (80h)")).toBeVisible();
  });

  it("filters member entries when none of member characters match filters", async () => {
    await render(<OnlinePlayersList viewMode="members" filtersVisible />);
    expect(await screen.findByText("(2) Discord User")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Minimalny poziom"), {
      target: { value: "200" },
    });
    expect(screen.queryByText("(2) Discord User")).not.toBeInTheDocument();
    expect(screen.getByText("Brak pasujących graczy")).toBeVisible();
  });

  it("hides guild, world and filters controls when filters are hidden", async () => {
    useSettingsStore.setState({ allowWorldSelection: true });
    await render(
      <OnlinePlayersList viewMode="accounts" filtersVisible={false} />,
    );
    expect(await screen.findByText("Hero (123w)")).toBeVisible();
    expect(screen.queryByPlaceholderText(/Szukaj/)).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Minimalny poziom")).not.toBeInTheDocument();
  });

  it("renders the empty presence state centered in the data viewport", async () => {
    harness.fetchPresence.mockResolvedValue(createPresenceSnapshot([]));
    await render(<OnlinePlayersList viewMode="accounts" filtersVisible />);
    expect(await screen.findByText("Nikt nie jest teraz online")).toBeVisible();
    expect(
      screen.getByText("Nikt nie jest teraz online").closest('[role="status"]'),
    ).toHaveClass(
      "ll:box-border",
      "ll:h-full",
      "ll:items-center",
      "ll:justify-center",
    );
  });

  it("shows no access feedback when online players permission is missing", async () => {
    harness.fetchPresence.mockRejectedValue(new Error("denied"));
    await render(<OnlinePlayersList viewMode="accounts" filtersVisible />);
    expect(await screen.findByText("Brak dostępu do listy")).toBeVisible();
    expect(
      screen.queryByText("Nikt nie jest teraz online"),
    ).not.toBeInTheDocument();
  });
});
