import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it } from "vitest";
import { configureApiClients } from "@lootlog/client/transport";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import {
  createReadyRoomParticipant,
  readSeededReadyRoomCache,
  readyRoomOrganizerFixture,
  seedReadyRoomCache,
} from "@/test/ready-room-fixtures";
import { useWindowsStore } from "@/store/windows.store";
import { createChatReadyRoom } from "@/features/chat/chat-test-fixtures";
import { PartyFinder } from "./party-finder";

let restore = () => {};

afterEach(() => {
  restore();
  useWindowsStore.getState().setOpen("party-finder", false);
});

it("does not expose management to a participant with a previously open window", () => {
  setTestRuntimeGame({
    hero: { accountId: "account-1", characterId: "101" },
  });
  useWindowsStore.getState().setOpen("party-finder", true);
  const client = new QueryClient();
  seedReadyRoomCache(client, [createChatReadyRoom()]);
  render(
    <QueryClientProvider client={client}>
      <PartyFinder />
    </QueryClientProvider>,
  );

  expect(screen.queryByText("Twoja zbiórka")).not.toBeInTheDocument();
  client.clear();
});

it("shows and cancels an owned gathering after switching character and world without offering game invitations", async () => {
  const requests: Request[] = [];
  restore = configureApiClients({
    main: {
      baseUrl: "https://api.test",
      fetch: (input, init) => {
        requests.push(new Request(input, init));

        return Promise.resolve(
          Response.json({
            schemaVersion: 3,
            type: "REMOVE",
            notificationId: "room",
            revision: 2,
          }),
        );
      },
    },
  });
  setTestRuntimeGame({
    hero: { accountId: "account", characterId: "second", name: "Second" },
    world: "Other",
  });
  useWindowsStore.getState().setOpen("party-finder", true);

  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  seedReadyRoomCache(client, [
    {
      schemaVersion: 3,
      notificationId: "room",
      organizerDiscordId: "owner",
      organizerCharacter: {
        accountId: "account",
        characterId: "first",
        nick: "First",
        lvl: 100,
        prof: "w",
        icon: "hero.gif",
      },
      guildIds: ["org"],
      world: "Original",
      status: "ACTIVE",
      revision: 1,
      createdAt: "2026-09-09T00:00:00Z",
      updatedAt: "2026-09-09T00:00:00Z",
      expiresAt: "2999-09-09T00:30:00Z",
      viewer: "ORGANIZER",
      participants: {},
      ownedParticipantIds: [],
    },
  ]);

  render(
    <QueryClientProvider client={client}>
      <PartyFinder />
    </QueryClientProvider>,
  );
  expect(screen.getByText("First · Original")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Zaproś wszystkich/i }),
  ).not.toBeInTheDocument();

  const user = userEvent.setup();

  const cancelGathering = screen.getByRole("button", {
    name: /Zakończ|Anuluj|Rozwiąż/i,
  });

  await user.click(cancelGathering);
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  await user.click(cancelGathering);
  await user.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Anuluj zbiórkę",
    }),
  );
  await waitFor(() => expect(requests).toHaveLength(1));
  const request = requests[0];

  if (!request) throw new Error("Expected cancellation request");
  expect(new URL(request.url).pathname).toBe(
    "/messaging/party-gathering/room/cancel",
  );
  expect(await request.json()).toEqual({ expectedRevision: 1 });
  await waitFor(() =>
    expect(readSeededReadyRoomCache(client).projections).toEqual({}),
  );
  client.clear();
});

it("lists only applicants still outside the party and counts them for inviting", () => {
  setTestRuntimeGame({
    hero: {
      accountId: "organizer-account",
      characterId: "organizer-character",
    },
  });
  useWindowsStore.getState().setOpen("party-finder", true);
  const client = new QueryClient();

  seedReadyRoomCache(client, [
    {
      ...readyRoomOrganizerFixture,
      participants: {
        waiting: createReadyRoomParticipant("waiting", "waiting-character"),
        joined: {
          ...createReadyRoomParticipant("joined", "joined-character"),
          partyPresence: "IN_PARTY",
        },
      },
    },
  ]);

  render(
    <QueryClientProvider client={client}>
      <PartyFinder />
    </QueryClientProvider>,
  );

  expect(screen.getByText("waiting (190m)")).toBeInTheDocument();
  expect(screen.queryByText("joined (190m)")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Zaproś wszystkich (1)" }),
  ).toBeInTheDocument();
  client.clear();
});
