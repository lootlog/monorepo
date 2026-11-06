import { configureApiClients } from "@lootlog/client/transport";
import type { PartyReadyRoomParticipantProjection } from "@lootlog/schema/party-ready-room";
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useReadyRoomCharacterSwitch } from "@/features/party-finder/hooks/use-ready-room-character-switch";
import { queryClient } from "@/lib/query-client";
import { useGlobalStore } from "@/store/global.store";
import {
  createReadyRoomParticipant,
  seedReadyRoomCache,
} from "@/test/ready-room-fixtures";
import { setTestRuntimeGame } from "@/test/test-runtime-window";

const requests: Request[] = [];

// The status the server answers an application with; 201 accepts it.
let applyStatus = 201;

let restoreClient = () => {};

const previous = {
  ...createReadyRoomParticipant("applicant", "previous-character"),
  character: {
    ...createReadyRoomParticipant("applicant", "previous-character").character,
    accountId: "account",
  },
};

const room = (minLvl?: number) =>
  ({
    schemaVersion: 3,
    notificationId: "room-1",
    organizerDiscordId: "organizer",
    guildIds: ["guild-1"],
    world: "luvia",
    status: "ACTIVE",
    revision: 2,
    createdAt: "2026-11-06T10:00:00.000Z",
    updatedAt: "2026-11-06T10:00:00.000Z",
    expiresAt: "2999-11-06T10:10:00.000Z",
    viewer: "PARTICIPANT",
    organizerCharacter: {
      accountId: "organizer-account",
      characterId: "organizer-character",
      icon: "character.gif",
      lvl: 200,
      nick: "Organizer",
      prof: "w",
    },
    participants: { applicant: previous },
    ...(minLvl !== undefined && { minLvl }),
  }) satisfies PartyReadyRoomParticipantProjection;

beforeEach(() => {
  requests.length = 0;
  applyStatus = 201;
  restoreClient = configureApiClients({
    main: { baseUrl: "https://api.test" },
  });
  vi.stubGlobal(
    "fetch",
    (input: string | URL | Request, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push(request.clone());

      if (request.method === "GET")
        return Promise.resolve(
          Response.json(request.url.includes("/active") ? [] : null),
        );

      if (request.method === "DELETE")
        return Promise.resolve(
          Response.json({
            schemaVersion: 3,
            type: "REMOVE",
            notificationId: "room-1",
            revision: 3,
          }),
        );

      if (applyStatus !== 201)
        return Promise.resolve(
          Response.json({ code: "REFUSED" }, { status: applyStatus }),
        );

      // The server moves the application onto the applying character.
      return Promise.resolve(
        Response.json(
          {
            ...room(),
            revision: 3,
            participants: {
              applicant: {
                ...previous,
                character: {
                  ...previous.character,
                  characterId: "current-character",
                },
              },
            },
          },
          { status: 201 },
        ),
      );
    },
  );
  useGlobalStore.getState().setSocketState({
    connected: true,
    joined: true,
    joinedGuilds: ["guild-1"],
  });
  setTestRuntimeGame({
    hero: {
      accountId: "account",
      characterId: "current-character",
      level: 150,
    },
  });
});

afterEach(() => {
  cleanup();
  queryClient.clear();
  restoreClient();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const renderSwitch = () =>
  renderHook(() => useReadyRoomCharacterSwitch(), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  });

const mutations = () =>
  requests.filter(
    (request) => request.method !== "GET" && request.url.includes("room-1"),
  );

it("moves an application to the character the player logged in to", async () => {
  seedReadyRoomCache(queryClient, [room()]);
  renderSwitch();

  await waitFor(() => expect(mutations()).toHaveLength(1));
  const [request] = mutations();
  expect(request?.method).toBe("POST");
  expect(new URL(request?.url ?? "").pathname).toBe(
    "/messaging/party-gathering/room-1/applications",
  );
  expect(await request?.json()).toMatchObject({
    world: "luvia",
    character: { accountId: "account", characterId: "current-character" },
  });
});

it("ends the application when the new character does not fit the gathering", async () => {
  seedReadyRoomCache(queryClient, [room(180)]);
  renderSwitch();

  await waitFor(() => expect(mutations()).toHaveLength(1));
  const [request] = mutations();
  expect(request?.method).toBe("DELETE");
  expect(await request?.json()).toEqual({ participantId: "applicant" });
});

it("ends the application when the server refuses the new character", async () => {
  applyStatus = 409;
  seedReadyRoomCache(queryClient, [room()]);
  renderSwitch();

  await waitFor(() =>
    expect(mutations().map(({ method }) => method)).toEqual(["POST", "DELETE"]),
  );
});

it("does not repeat a failed application on every room update", async () => {
  applyStatus = 503;
  seedReadyRoomCache(queryClient, [room()]);
  renderSwitch();

  await waitFor(() => expect(mutations()).toHaveLength(1));

  seedReadyRoomCache(queryClient, [{ ...room(), revision: 3 }]);
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(mutations().map(({ method }) => method)).toEqual(["POST"]);
});
