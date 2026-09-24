import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it } from "vitest";
import { configureApiClients } from "@lootlog/client/transport";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import {
  readSeededReadyRoomCache,
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
  fireEvent.click(
    screen.getByRole("button", { name: /Zakończ|Anuluj|Rozwiąż/i }),
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
