import { useGameStore } from "@/store/game.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { expect, it } from "vitest";
import {
  readyRoomOrganizerFixture,
  seedReadyRoomCache,
} from "@/test/ready-room-fixtures";
import { mergeReadyRoomProjectionIntoCache } from "./use-ready-rooms-cache";
import {
  useCurrentCharacterReadyRoom,
  useOwnedReadyRoom,
  useHasOwnedReadyRoom,
  useReadyRoomsSynchronized,
} from "./use-ready-rooms";

it.each([
  [
    "owned room",
    useOwnedReadyRoom,
    { ...readyRoomOrganizerFixture, revision: 4 },
  ],
  ["owned room availability", useHasOwnedReadyRoom, true],
  [
    "character room",
    useCurrentCharacterReadyRoom,
    { ...readyRoomOrganizerFixture, revision: 4 },
  ],
  ["synchronization", useReadyRoomsSynchronized, false],
] as const)(
  "does not render the %s observer for unrelated room revisions",
  async (_name, useSelection, updatedValue) => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    seedReadyRoomCache(client, [readyRoomOrganizerFixture]);

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    let renders = 0;

    const view = renderHook(
      () => {
        renders += 1;

        return useSelection();
      },
      { wrapper },
    );

    try {
      const initialRenders = renders;
      const initialValue = view.result.current;

      const { ownedParticipantIds: _owned, ...otherRoom } =
        readyRoomOrganizerFixture;

      await act(async () => {
        mergeReadyRoomProjectionIntoCache(
          {
            ...otherRoom,
            notificationId: "other-room",
            viewer: "PARTICIPANT",
            revision: 1,
          },
          client,
        );
        await new Promise((resolve) => setTimeout(resolve, 5));
      });

      expect(view.result.current).toBe(initialValue);
      expect(renders).toBe(initialRenders);
      await act(async () => {
        mergeReadyRoomProjectionIntoCache(
          { ...readyRoomOrganizerFixture, revision: 4 },
          client,
        );
        await new Promise((resolve) => setTimeout(resolve, 5));
      });

      expect(view.result.current).toEqual(updatedValue);
    } finally {
      view.unmount();
      client.clear();
    }
  },
);

it("updates the character room when switching characters without a cache write", () => {
  const client = new QueryClient();
  const { ownedParticipantIds: _owned, ...room } = readyRoomOrganizerFixture;
  seedReadyRoomCache(client, [{ ...room, viewer: "PARTICIPANT" }]);
  const previousGame = useGameStore.getState().game;
  setTestRuntimeGame({
    hero: { accountId: "other-account", characterId: "other-character" },
  });

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  const view = renderHook(useCurrentCharacterReadyRoom, { wrapper });

  try {
    expect(view.result.current).toBeNull();
    act(() =>
      setTestRuntimeGame({
        hero: {
          accountId: room.participants["participant-1"].character.accountId,
          characterId: room.participants["participant-1"].character.characterId,
        },
      }),
    );
    expect(view.result.current?.notificationId).toBe(room.notificationId);
    act(() =>
      setTestRuntimeGame({
        hero: { accountId: "other-account", characterId: "other-character" },
      }),
    );
    expect(view.result.current).toBeNull();
  } finally {
    view.unmount();
    client.clear();
    useGameStore.setState({ game: previousGame });
  }
});
