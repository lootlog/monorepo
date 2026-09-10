import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  getMembersControllerGetMeQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  type ActivePartyGatheringSummary,
} from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { createRealtimeTest } from "@/test/realtime-test";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import {
  createReadyRoomParticipant,
  readyRoomOrganizerFixture,
} from "@/test/ready-room-fixtures";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";
import { useChatStore } from "@/store/chat.store";
import { useHiddenPartyGatheringsStore } from "@/store/hidden-party-gatherings.store";
import { useHotkeysStore } from "@/store/hotkeys.store";
import { resetReadyRoomInvitationCoordinatorForTests } from "@/features/party-finder/ready-room-invitation-coordinator";
import { ACTIVE_GATHERINGS_QUERY_KEY } from "../hooks/use-active-party-gatherings";
import { createChatMember, createChatReadyRoom } from "../chat-test-fixtures";
import { ChatGatheringBar } from "./chat-gathering-bar";
import { ChatInput } from "./chat-input";

const createGathering = (
  overrides: Partial<ActivePartyGatheringSummary> = {},
): ActivePartyGatheringSummary => ({
  notificationId: "room-1",
  organizerName: "Leader",
  applicantCount: 0,
  inPartyCount: 0,
  guildIds: ["guild-1"],
  world: "pandora",
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  ...overrides,
});

const setup = async (rooms: ActivePartyGatheringSummary[] = []) => {
  const harness = createRealtimeTest();
  usePartyFinderStore.getState().clearReadyRooms();
  useHiddenPartyGatheringsStore.setState({ hiddenByScope: {} });
  useHotkeysStore.getState().resetAll();
  useChatStore.setState(useChatStore.getInitialState(), true);
  setTestRuntimeGame({ hero: { accountId: "account-1", characterId: "101" } });
  harness.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [{ id: "guild-1", name: "Guild" }],
  );
  harness.queryClient.setQueryData(
    getUsersControllerGetUserPreferencesQueryKey(),
    { guildsOrder: [], hiddenGuildIds: [] },
  );
  harness.queryClient.setQueryData(
    getGuildsControllerGetGuildPermissionsQueryKey({ guildId: "guild-1" }),
    [],
  );
  harness.queryClient.setQueryData(
    getMembersControllerGetMeQueryKey({ guildId: "guild-1" }),
    createChatMember(),
  );
  const discovery = vi
    .fn<() => Promise<Response>>()
    .mockImplementation(async () => Response.json(rooms));
  const mutation = vi.fn<typeof fetch>();
  const restoreApi = configureApiClients({
    main: {
      baseUrl: "https://api.example.test",
      fetch: async (input, init) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
        );
        if (url.pathname === "/messaging/party-gathering/active")
          return discovery();
        return mutation(input, init);
      },
    },
  });
  const view = render(
    <ChatGatheringBar>
      {(backgroundColor, gatheringBar, hiddenGatherings) => (
        <>
          {gatheringBar}
          {hiddenGatherings}
          <ChatInput
            selectedGuildId="guild-1"
            backgroundColor={backgroundColor}
          />
        </>
      )}
    </ChatGatheringBar>,
    { wrapper: harness.wrapper },
  );
  onTestFinished(() => {
    view.unmount();
    restoreApi();
    usePartyFinderStore.getState().clearReadyRooms();
    useHiddenPartyGatheringsStore.setState({ hiddenByScope: {} });
    useHotkeysStore.getState().resetAll();
    useChatStore.setState(useChatStore.getInitialState(), true);
  });
  act(() => harness.setSessionDiscordId("current-discord"));
  harness.open();
  await harness.join();
  await waitFor(() => expect(discovery).toHaveBeenCalled());
  const refresh = () =>
    act(async () => {
      await harness.queryClient.invalidateQueries({
        queryKey: ACTIVE_GATHERINGS_QUERY_KEY,
      });
    });
  return {
    ...harness,
    discovery,
    mutation,
    refresh,
    container: view.container,
  };
};

afterEach(() => vi.restoreAllMocks());

it("keeps application errors separate from discovery and blocks duplicate or stale signups", async () => {
  const room = createGathering();
  const harness = await setup([room]);
  const signup = await screen.findByRole("button", { name: "Zgłoś się" });
  const pending = Promise.withResolvers<Response>();
  harness.mutation.mockReturnValue(pending.promise);
  act(() => {
    signup.click();
    signup.click();
  });
  await waitFor(() => expect(harness.mutation).toHaveBeenCalledTimes(1));
  const hide = screen.getByRole("button", { name: "Ukryj zbiórkę" });
  expect(hide).toBeDisabled();
  fireEvent.click(hide);
  expect(useHiddenPartyGatheringsStore.getState().hiddenByScope).toEqual({});
  await act(async () => {
    pending.resolve(Response.json({ message: "Failed" }, { status: 500 }));
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Nie udało się zgłosić",
  );
  await harness.refresh();
  expect(harness.mutation).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert")).toHaveTextContent("Nie udało się zgłosić");
  harness.discovery.mockImplementation(async () =>
    Response.json({ message: "Unavailable" }, { status: 500 }),
  );
  await harness.refresh();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Zgłoś się" })).toBeDisabled(),
  );
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue(
    Object.assign([new DOMRect()], { item: () => new DOMRect() }),
  );
  act(() => window.dispatchEvent(new Event("lootlog:join-visible-gathering")));
  expect(harness.mutation).toHaveBeenCalledTimes(1);
  harness.discovery.mockImplementation(async () => Response.json([room]));
  fireEvent.click(screen.getByRole("button", { name: "Odśwież" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Zgłoś się" })).toBeEnabled(),
  );
  harness.mutation.mockImplementation(async () =>
    Response.json(createChatReadyRoom({ world: "pandora" })),
  );
  fireEvent.click(screen.getByRole("button", { name: "Zgłoś się" }));
  await waitFor(() =>
    expect(usePartyFinderStore.getState().projections["room-1"]?.viewer).toBe(
      "PARTICIPANT",
    ),
  );
  expect(harness.mutation).toHaveBeenCalledTimes(2);
  await waitFor(() =>
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
  );
});

it.each(["ORGANIZER", "PARTICIPANT"] as const)(
  "retains the %s room after failed removal and removes it after retry",
  async (viewer) => {
    const harness = await setup();
    const room =
      viewer === "ORGANIZER"
        ? { ...readyRoomOrganizerFixture, world: "pandora" }
        : createChatReadyRoom({ world: "pandora" });
    act(() => usePartyFinderStore.getState().mergeProjection(room));
    harness.mutation.mockImplementation(async () =>
      Response.json({ message: "Failed" }, { status: 500 }),
    );
    const name =
      viewer === "ORGANIZER" ? "Anuluj zbiórkę" : "Wycofaj zgłoszenie";
    fireEvent.click(await screen.findByRole("button", { name }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nie udało się");
    expect(usePartyFinderStore.getState().projections["room-1"]).toBeDefined();
    harness.mutation.mockImplementation(async () =>
      Response.json({
        schemaVersion: 3,
        type: "REMOVE",
        notificationId: "room-1",
        revision: 4,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name }));
    await waitFor(() =>
      expect(
        usePartyFinderStore.getState().projections["room-1"],
      ).toBeUndefined(),
    );
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(harness.mutation).toHaveBeenCalledTimes(2);
  },
);

it("counts organizer applicants without adding the organizer and opens management", async () => {
  await setup();
  const room = {
    ...readyRoomOrganizerFixture,
    world: "pandora",
    participants: {
      ...readyRoomOrganizerFixture.participants,
      second: {
        ...createReadyRoomParticipant("second", "second-character"),
        partyPresence: "IN_PARTY" as const,
      },
      organizer: {
        ...createReadyRoomParticipant("organizer", "organizer-character"),
        character: readyRoomOrganizerFixture.organizerCharacter,
        partyPresence: "IN_PARTY" as const,
      },
      otherOrganizerCharacter: {
        ...createReadyRoomParticipant("organizer-alt", "organizer-alt"),
        character: {
          ...readyRoomOrganizerFixture.organizerCharacter,
          characterId: "organizer-alt",
        },
      },
    },
  };
  act(() => {
    useWindowsStore.getState().setOpen("party-finder", false);
    usePartyFinderStore.getState().mergeProjection(room);
  });
  expect(await screen.findByLabelText("Zgłoszeni: 3")).toBeVisible();
  expect(screen.getByLabelText("W grupie: 1 ze zgłoszonych")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: /^Zarządzaj/ }));
  expect(useWindowsStore.getState()["party-finder"].open).toBe(true);
  act(() =>
    usePartyFinderStore.getState().mergeProjection({
      ...room,
      revision: room.revision + 1,
      participants: {},
    }),
  );
  expect(await screen.findByLabelText("Zgłoszeni: 0")).toBeVisible();
  expect(screen.getByLabelText("W grupie: 0 ze zgłoszonych")).toBeVisible();
  useWindowsStore.getState().setOpen("party-finder", false);
});

it("invites applicants only when available, blocks double clicks and recovers after a request failure", async () => {
  const harness = await setup();
  resetReadyRoomInvitationCoordinatorForTests();
  const gameInvite = vi.fn();
  vi.stubGlobal("_g", gameInvite);
  onTestFinished(() => {
    resetReadyRoomInvitationCoordinatorForTests();
    vi.unstubAllGlobals();
  });
  act(() =>
    usePartyFinderStore.getState().mergeProjection({
      ...readyRoomOrganizerFixture,
      world: "pandora",
    }),
  );
  const invite = await screen.findByRole("button", {
    name: "Zaproś zgłoszonych",
  });
  expect(invite).toBeDisabled();
  fireEvent.click(invite);
  expect(harness.mutation).not.toHaveBeenCalled();
  act(() => {
    setTestRuntimeGame({
      hero: {
        accountId: "organizer-account",
        characterId: "organizer-character",
      },
    });
    usePartyFinderStore.getState().setReadyRoomsSynchronized(true);
  });
  await waitFor(() => expect(invite).toBeEnabled());
  const pending = Promise.withResolvers<Response>();
  harness.mutation.mockReturnValue(pending.promise);
  act(() => {
    invite.click();
    invite.click();
  });
  await waitFor(() => expect(harness.mutation).toHaveBeenCalledTimes(1));
  expect(
    screen.getByRole("button", { name: "Wysyłanie zaproszeń…" }),
  ).toBeDisabled();
  await act(async () =>
    pending.resolve(Response.json({ message: "Failed" }, { status: 500 })),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Nie udało się wysłać zaproszeń",
  );
  expect(gameInvite).not.toHaveBeenCalled();
  harness.mutation.mockImplementation(async () =>
    Response.json({
      targets: [
        {
          participantId: "participant-1",
          characterId: "participant-character",
        },
      ],
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Zaproś zgłoszonych" }));
  await waitFor(() =>
    expect(gameInvite).toHaveBeenCalledWith(
      "party&a=inv&id=participant-character",
    ),
  );
  expect(gameInvite).toHaveBeenCalledTimes(1);
  expect(harness.mutation).toHaveBeenCalledTimes(2);
  await waitFor(() =>
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
  );
});

it.each(["OUTSIDE", "IN_PARTY"] as const)(
  "shows the current participant's %s status rather than another applicant's",
  async (partyPresence) => {
    await setup();
    const room = createChatReadyRoom({ world: "pandora" });
    const participant = room.participants["participant-1"];
    if (!participant) throw new Error("Expected current character fixture");
    act(() =>
      usePartyFinderStore.getState().mergeProjection({
        ...room,
        participants: {
          "participant-1": { ...participant, partyPresence },
          second: {
            ...createReadyRoomParticipant("second", "other-character"),
            partyPresence: partyPresence === "OUTSIDE" ? "IN_PARTY" : "OUTSIDE",
          },
        },
      }),
    );
    expect(
      await screen.findByRole("button", { name: "Wycofaj zgłoszenie" }),
    ).toHaveAccessibleDescription(
      partyPresence === "IN_PARTY" ? "W grupie" : "Zgłoszono",
    );
  },
);

it("keeps the hovered signup target and prioritizes an owned room", async () => {
  const room = createGathering({
    notificationId: "original-room",
  });
  const harness = await setup([room]);
  await screen.findByRole("button", { name: "Zgłoś się" });
  const panel = harness.container.firstElementChild;
  if (!(panel instanceof HTMLElement))
    throw new Error("Expected gathering panel");
  fireEvent.mouseEnter(panel);
  harness.discovery.mockImplementation(async () =>
    Response.json([{ ...room, notificationId: "newer-room" }, room]),
  );
  await harness.refresh();
  harness.mutation.mockResolvedValue(
    Response.json({ message: "Failed" }, { status: 500 }),
  );
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue(
    Object.assign([new DOMRect()], { item: () => new DOMRect() }),
  );
  act(() => window.dispatchEvent(new Event("lootlog:join-visible-gathering")));
  await waitFor(() => expect(harness.mutation).toHaveBeenCalledTimes(1));
  expect(String(harness.mutation.mock.calls[0]?.[0])).toContain(
    "original-room",
  );
  act(() =>
    usePartyFinderStore
      .getState()
      .mergeProjection({ ...readyRoomOrganizerFixture, world: "pandora" }),
  );
  await waitFor(() => {
    for (const signup of screen.getAllByRole("button", { name: "Zgłoś się" }))
      expect(signup).toBeDisabled();
  });
});

it("keeps full discovery counts after joining despite a private projection and marks missing counts as unavailable", async () => {
  const gathering = createGathering({ applicantCount: 6, inPartyCount: 2 });
  const harness = await setup([gathering]);
  expect(await screen.findByLabelText("Zgłoszeni: 6")).toBeVisible();
  expect(screen.getByLabelText("W grupie: 2 ze zgłoszonych")).toBeVisible();
  harness.mutation.mockImplementation(async () =>
    Response.json(createChatReadyRoom({ world: "pandora" })),
  );
  fireEvent.click(screen.getByRole("button", { name: "Zgłoś się" }));
  await screen.findByRole("button", { name: "Wycofaj zgłoszenie" });
  expect(screen.getByLabelText("Zgłoszeni: 6")).toBeVisible();
  expect(screen.getByLabelText("W grupie: 2 ze zgłoszonych")).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Wycofaj zgłoszenie" }),
  ).toHaveAccessibleDescription("Zgłoszono");
  expect(screen.queryByRole("button", { name: "Ukryj zbiórkę" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Zarządzaj" })).toBeNull();

  harness.discovery.mockImplementation(async () =>
    Response.json([{ ...gathering, applicantCount: 7, inPartyCount: 3 }]),
  );
  await harness.refresh();
  expect(await screen.findByLabelText("Zgłoszeni: 7")).toBeVisible();
  expect(screen.getByLabelText("W grupie: 3 ze zgłoszonych")).toBeVisible();

  harness.discovery.mockImplementation(async () => Response.json([]));
  await harness.refresh();
  expect(
    await screen.findByLabelText("Liczba zgłoszonych niedostępna"),
  ).toHaveTextContent("—");
  expect(
    screen.getByLabelText("Liczba zgłoszonych w grupie niedostępna"),
  ).toHaveTextContent("—");
  expect(screen.queryByLabelText("Zgłoszeni: 0")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Wycofaj zgłoszenie" }),
  ).toBeEnabled();
});

it("hides a frozen hovered target and makes the next visible gathering the hotkey target", async () => {
  const gathering = createGathering({
    notificationId: "original-room",
    description: "Original gathering",
  });
  const harness = await setup([gathering]);
  await screen.findByRole("button", { name: "Zgłoś się" });
  const panel = harness.container.firstElementChild;
  if (!(panel instanceof HTMLElement))
    throw new Error("Expected gathering panel");
  fireEvent.mouseEnter(panel);
  harness.discovery.mockImplementation(async () =>
    Response.json([
      {
        ...gathering,
        notificationId: "newer-room",
        description: "New gathering",
      },
      gathering,
    ]),
  );
  await harness.refresh();
  expect(screen.getByText("Original gathering")).toBeVisible();
  const firstHide = screen.getAllByRole("button", { name: "Ukryj zbiórkę" })[0];
  if (!firstHide) throw new Error("Expected first gathering hide action");
  fireEvent.click(firstHide);
  expect(await screen.findByText("New gathering")).toBeVisible();
  expect(screen.queryByText("Original gathering")).toBeNull();
  await harness.refresh();
  expect(screen.queryByText("Original gathering")).toBeNull();

  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue(
    Object.assign([new DOMRect()], { item: () => new DOMRect() }),
  );
  harness.mutation.mockImplementation(async () =>
    Response.json({ message: "Failed" }, { status: 500 }),
  );
  act(() => window.dispatchEvent(new Event("lootlog:join-visible-gathering")));
  await waitFor(() => expect(harness.mutation).toHaveBeenCalledTimes(1));
  expect(String(harness.mutation.mock.calls[0]?.[0])).toContain("newer-room");
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Ukryj zbiórkę" }));
  expect(screen.queryByRole("button", { name: "Zgłoś się" })).toBeNull();
  act(() => window.dispatchEvent(new Event("lootlog:join-visible-gathering")));
  expect(harness.mutation).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("textbox", { name: "Wiadomość..." })).toBeVisible();
});

it("restores hidden gatherings through their floating menu and keeps new IDs and other characters visible", async () => {
  const user = userEvent.setup();
  const gathering = createGathering({ description: "Original gathering" });
  const harness = await setup([gathering]);
  const editor = screen.getByRole("textbox", { name: "Wiadomość..." });
  await user.click(editor);
  await user.paste("Keep this draft");
  await user.click(screen.getByRole("button", { name: "Ukryj zbiórkę" }));
  expect(screen.queryByRole("button", { name: "Zgłoś się" })).toBeNull();
  expect(screen.getByRole("textbox", { name: "Wiadomość..." })).toBe(editor);
  expect(editor).toHaveTextContent("Keep this draft");

  act(() =>
    setTestRuntimeGame({
      hero: { accountId: "account-1", characterId: "another-character" },
    }),
  );
  expect(
    await screen.findByRole("button", { name: "Zgłoś się" }),
  ).toBeEnabled();
  act(() =>
    setTestRuntimeGame({
      hero: { accountId: "account-1", characterId: "101" },
    }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Zgłoś się" })).toBeNull(),
  );

  await user.click(screen.getByRole("button", { name: "Ukryte zbiórki (1)" }));
  await user.click(
    await screen.findByRole("button", {
      name: "Przywróć zbiórkę: Original gathering",
    }),
  );
  const restoredHide = await screen.findByRole("button", {
    name: "Ukryj zbiórkę",
  });
  await waitFor(() => expect(restoredHide).toHaveFocus());
  await user.click(restoredHide);

  const newGathering = {
    ...gathering,
    notificationId: "new-room-same-organizer",
    description: "New gathering",
  };
  harness.discovery.mockImplementation(async () =>
    Response.json([newGathering, gathering]),
  );
  await harness.refresh();
  expect(await screen.findByText("New gathering")).toBeVisible();
  expect(screen.queryByText("Original gathering")).toBeNull();
  await user.click(
    await screen.findByRole("button", { name: "Ukryte zbiórki (1)" }),
  );
  await user.click(
    await screen.findByRole("button", {
      name: "Przywróć zbiórkę: Original gathering",
    }),
  );
  await waitFor(() =>
    expect(
      screen.getAllByRole("button", { name: "Ukryj zbiórkę" })[0],
    ).toHaveFocus(),
  );
  expect(await screen.findByText("Original gathering")).toBeVisible();
  expect(editor).toHaveTextContent("Keep this draft");
  expect(useChatStore.getState().draftsByGuild["guild-1"]).toBe(
    "Keep this draft",
  );
});

it("keeps keyboard focus on the hidden gatherings menu after hiding a secondary or last gathering", async () => {
  const user = userEvent.setup();
  await setup([
    createGathering({ description: "First" }),
    createGathering({ notificationId: "second-room", description: "Second" }),
  ]);
  const secondaryHide = screen.getAllByRole("button", {
    name: "Ukryj zbiórkę",
  })[1];
  if (!secondaryHide) throw new Error("Expected secondary gathering");
  act(() => secondaryHide.focus());
  await user.keyboard("{Enter}");
  const menu = await screen.findByRole("button", {
    name: "Ukryte zbiórki (1)",
  });
  await waitFor(() => expect(menu).toHaveFocus());
  expect(screen.queryByText("Second")).toBeNull();
  act(() => screen.getByRole("button", { name: "Ukryj zbiórkę" }).focus());
  await user.keyboard("{Enter}");
  await waitFor(() => expect(menu).toHaveFocus());
  expect(screen.queryByText("First")).toBeNull();
  await user.keyboard("{Enter}");
  expect(
    await screen.findByRole("button", { name: "Przywróć zbiórkę: First" }),
  ).toBeVisible();
});

it("joins the selected organizer from the visible list and enables other signups after withdrawal", async () => {
  const user = userEvent.setup();
  const harness = await setup([
    createGathering({ description: "First", organizerName: "First organizer" }),
    createGathering({
      notificationId: "second-room",
      description: "Second",
      organizerName: "Second organizer",
    }),
  ]);
  harness.mutation.mockResolvedValueOnce(
    Response.json(
      createChatReadyRoom({
        notificationId: "second-room",
        world: "pandora",
        description: "Second",
      }),
    ),
  );
  const secondOrganizer = screen
    .getAllByRole("listitem")
    .find((row) => within(row).queryByText("Party finder · Second organizer"));
  if (!secondOrganizer) throw new Error("Expected second organizer gathering");
  await user.click(
    within(secondOrganizer).getByRole("button", { name: "Zgłoś się" }),
  );
  await waitFor(() => expect(harness.mutation).toHaveBeenCalledTimes(1));
  expect(String(harness.mutation.mock.calls[0]?.[0])).toContain("second-room");
  const withdrawal = await screen.findByRole("button", {
    name: "Wycofaj zgłoszenie",
  });
  expect(screen.getByText("First")).toBeVisible();
  expect(screen.getByRole("button", { name: "Zgłoś się" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Ukryj zbiórkę" })).toBeEnabled();
  harness.mutation.mockResolvedValueOnce(
    Response.json({
      schemaVersion: 3,
      type: "REMOVE",
      notificationId: "second-room",
      revision: 4,
    }),
  );
  await user.click(withdrawal);
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Wycofaj zgłoszenie" }),
    ).toBeNull(),
  );
  expect(screen.getByText("First")).toBeVisible();
  for (const action of screen.getAllByRole("button", {
    name: /^(Zgłoś się|Ukryj zbiórkę)$/,
  })) {
    expect(action).toBeEnabled();
  }
});

it("preserves the editor focus, draft and caret while gatherings appear, change and disappear", async () => {
  const user = userEvent.setup();
  const harness = await setup();
  const editor = screen.getByRole("textbox", { name: "Wiadomość..." });
  await user.click(editor);
  await user.paste("Keep this draft");
  const textNode = editor.querySelector("[data-lexical-text]")?.firstChild;
  const selection = document.getSelection();
  if (!(textNode instanceof Text) || !selection)
    throw new Error("Expected editor text selection");
  act(() => {
    selection.setBaseAndExtent(textNode, 4, textNode, 4);
    fireEvent(document, new Event("selectionchange"));
  });

  const gathering = createGathering();
  harness.discovery.mockImplementation(async () => Response.json([gathering]));
  await harness.refresh();
  await screen.findByRole("button", { name: "Zgłoś się" });
  harness.discovery.mockImplementation(async () =>
    Response.json([
      {
        ...gathering,
        npc: { name: "Npc", type: "ELITE2", lvl: 100, location: "Map" },
      },
    ]),
  );
  await harness.refresh();
  harness.discovery.mockImplementation(async () => Response.json([]));
  await harness.refresh();
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Zgłoś się" })).toBeNull(),
  );
  expect(screen.getByRole("textbox", { name: "Wiadomość..." })).toBe(editor);
  expect(editor).toHaveFocus();
  expect(editor).toHaveTextContent("Keep this draft");
  expect(selection.focusNode).toBe(textNode);
  expect(selection.focusOffset).toBe(4);
  await user.keyboard("!");
  expect(useChatStore.getState().draftsByGuild["guild-1"]).toBe(
    "Keep! this draft",
  );
});

it("updates the main join tooltip from the live binding without advertising its shortcut on another gathering", async () => {
  const user = userEvent.setup();
  await setup([
    createGathering(),
    createGathering({ notificationId: "second-room" }),
  ]);
  const binding = {
    type: "keyboard" as const,
    key: "J",
    ctrl: true,
    alt: false,
    shift: false,
  };
  act(() =>
    useHotkeysStore.getState().setBinding("join-party-gathering", binding),
  );
  const signup = (
    await screen.findAllByRole("button", { name: "Zgłoś się" })
  )[0];
  if (!signup) throw new Error("Expected first gathering signup");
  await user.keyboard("{Tab}");
  act(() => signup.focus());
  expect(await screen.findByRole("tooltip")).toHaveTextContent(
    "Zgłoś się (Ctrl + J)",
  );
  act(() =>
    useHotkeysStore.getState().setBinding("join-party-gathering", {
      ...binding,
      key: "K",
    }),
  );
  expect(screen.getByRole("tooltip")).toHaveTextContent("Zgłoś się (Ctrl + K)");
  act(() =>
    useHotkeysStore.getState().setBinding("join-party-gathering", {
      ...binding,
      key: "",
    }),
  );
  expect(screen.getByRole("tooltip")).toHaveTextContent(
    "Zgłoś się (Skrót nieustawiony)",
  );
  const secondarySignup = screen.getAllByRole("button", {
    name: "Zgłoś się",
  })[1];
  if (!secondarySignup) throw new Error("Expected secondary gathering signup");
  await user.keyboard("{Tab}");
  act(() => secondarySignup.focus());
  await waitFor(() =>
    expect(screen.getByRole("tooltip").textContent).toBe("Zgłoś się"),
  );
});
