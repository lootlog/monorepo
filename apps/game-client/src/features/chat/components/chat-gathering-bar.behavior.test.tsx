import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
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
import { resetReadyRoomInvitationCoordinatorForTests } from "@/features/party-finder/ready-room-invitation-coordinator";
import { ACTIVE_GATHERINGS_QUERY_KEY } from "../hooks/use-active-party-gatherings";
import { createChatReadyRoom } from "../chat-test-fixtures";
import { ChatGatheringBar } from "./chat-gathering-bar";

const setup = async (rooms: ActivePartyGatheringSummary[] = []) => {
  const harness = createRealtimeTest();
  usePartyFinderStore.getState().clearReadyRooms();
  setTestRuntimeGame({ hero: { accountId: "account-1", characterId: "101" } });
  harness.queryClient.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [{ id: "guild-1", name: "Guild" }],
  );
  harness.queryClient.setQueryData(
    getUsersControllerGetUserPreferencesQueryKey(),
    { guildsOrder: [], hiddenGuildIds: [] },
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
  const view = render(<ChatGatheringBar />, {
    wrapper: harness.wrapper,
  });
  onTestFinished(() => {
    view.unmount();
    restoreApi();
    usePartyFinderStore.getState().clearReadyRooms();
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
  const room: ActivePartyGatheringSummary = {
    notificationId: "room-1",
    organizerName: "Leader",
    guildIds: ["guild-1"],
    world: "pandora",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  const harness = await setup([room]);
  const signup = await screen.findByRole("button", { name: "Zgłoś się" });
  const pending = Promise.withResolvers<Response>();
  harness.mutation.mockReturnValue(pending.promise);
  act(() => {
    signup.click();
    signup.click();
  });
  await waitFor(() => expect(harness.mutation).toHaveBeenCalledTimes(1));
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
    },
  };
  act(() => {
    useWindowsStore.getState().setOpen("party-finder", false);
    usePartyFinderStore.getState().mergeProjection(room);
  });
  expect(await screen.findByLabelText("Zgłoszeni: 2")).toBeVisible();
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
      await screen.findByText(
        partyPresence === "IN_PARTY" ? "W grupie" : "Zgłoszono",
        { exact: true },
      ),
    ).toBeVisible();
  },
);

it("keeps the hovered signup target and prioritizes an owned room", async () => {
  const room: ActivePartyGatheringSummary = {
    notificationId: "original-room",
    organizerName: "Leader",
    guildIds: ["guild-1"],
    world: "pandora",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
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
  fireEvent.click(screen.getByRole("button", { name: "Zgłoś się" }));
  await waitFor(() => expect(harness.mutation).toHaveBeenCalledTimes(1));
  expect(String(harness.mutation.mock.calls[0]?.[0])).toContain(
    "original-room",
  );
  act(() =>
    usePartyFinderStore
      .getState()
      .mergeProjection({ ...readyRoomOrganizerFixture, world: "pandora" }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Zgłoś się" }),
    ).not.toBeInTheDocument(),
  );
});
