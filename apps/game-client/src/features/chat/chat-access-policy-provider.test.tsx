import { act, render } from "@testing-library/react";
import { QueryObserver } from "@tanstack/react-query";
import { RealtimeClient } from "@lootlog/client/realtime";
import { configureGameClientPlatform } from "@/lib/game-client-platform";
import { disposeSocket } from "@/lib/socket";
import { RealtimeWire } from "@/test/realtime-wire";
import { SocketProvider } from "@/contexts/socket-context";
import { queryClient } from "@/lib/query-client";
import { useGlobalStore } from "@/store/global.store";
import type { ChatMessage } from "@/api/chat.api";

let restorePlatform: () => void;
let wire: RealtimeWire;
beforeEach(() => {
  disposeSocket();
  wire = new RealtimeWire();
  const realtime = new RealtimeClient({
    url: "https://gateway.example.test",
    webSocketFactory: () => wire,
  });
  restorePlatform = configureGameClientPlatform({
    fetch: globalThis.fetch,
    createRealtime: () => realtime,
  });
});

afterEach(() => {
  disposeSocket();
  restorePlatform();
  queryClient.clear();
  vi.useRealTimers();
});

it("purges and coalesces legacy chat refresh in the provider even without a mounted chat listener", async () => {
  vi.useFakeTimers();
  useGlobalStore.setState({ gameState: { gameInitialized: false } });
  const key = ["/guilds/a/chat-messages"];
  const otherKey = ["/guilds/b/chat-messages"];
  const row: ChatMessage = {
    id: "old",
    guildId: "a",
    message: "old",
    type: "NORMAL",
    senderId: "sender",
    timestamp: "2026-09-07T00:00:00.000Z",
    characterData: {
      nick: "Sender",
      id: 1,
      acc: 1,
      lvl: 50,
      prof: "w",
      icon: "icon",
    },
    canEdit: false,
    canDelete: false,
  };
  queryClient.setQueryData(key, [row]);
  queryClient.setQueryData(otherKey, [{ ...row, guildId: "b" }]);
  const fetch = vi.fn<() => Promise<ChatMessage[]>>().mockResolvedValue([]);
  const observer = new QueryObserver(queryClient, {
    queryKey: key,
    queryFn: fetch,
    staleTime: Infinity,
  });
  const unsubscribe = observer.subscribe(() => {});
  const { unmount } = render(
    <SocketProvider>
      <div />
    </SocketProvider>,
  );
  act(() => wire.open());
  await act(async () => {
    for (let index = 0; index < 10; index++)
      wire.receive({
        v: 1,
        type: "permissions.updated",
        data: { organizationIds: ["a", "b"], subscriptionScopes: [] },
      });
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(queryClient.getQueryData(key)).toEqual([]);
  expect(queryClient.getQueryData(otherKey)).toEqual([]);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(4999);
  });
  expect(fetch).not.toHaveBeenCalled();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(queryClient.getQueryState(otherKey)?.isInvalidated).toBe(true);
  unsubscribe();
  unmount();
});
