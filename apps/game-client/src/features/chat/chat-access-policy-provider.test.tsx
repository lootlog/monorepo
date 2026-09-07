import { act, render } from "@testing-library/react";
import { QueryObserver } from "@tanstack/react-query";
import { GatewayEvent } from "@/config/gateway";
import { SocketProvider } from "@/contexts/socket-context";
import { queryClient } from "@/lib/query-client";
import { useGlobalStore } from "@/store/global.store";
import type { ChatMessage } from "@/api/chat.api";

const { handlers, socket } = vi.hoisted(() => {
  const handlers = new Map<string, (data: unknown) => void>();
  return {
    handlers,
    socket: {
      connected: false,
      getAccessPolicy: () => undefined,
      connect: vi.fn(),
      disconnect: vi.fn(),
      emit: vi.fn(),
      on: (event: string, listener: (data: unknown) => void) =>
        handlers.set(event, listener),
      off: (event: string) => handlers.delete(event),
    },
  };
});
vi.mock("@/lib/socket", () => ({ getSocket: () => socket }));

afterEach(() => {
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
  const fetch = vi.fn().mockResolvedValue([]);
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
  act(() => {
    for (let index = 0; index < 10; index++)
      handlers.get(GatewayEvent.PERMISSIONS_UPDATED)?.({
        guilds: [{ guild: { id: "a" } }, { guild: { id: "b" } }],
      });
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
