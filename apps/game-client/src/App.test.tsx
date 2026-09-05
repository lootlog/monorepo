import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RealtimeClient,
  type RealtimeWebSocket,
} from "@lootlog/client/realtime";
import App from "./App";
import { authClient } from "@/lib/auth-client";
import { configureGameClientPlatform } from "@/lib/game-client-platform";
import { disposeSocket } from "@/lib/socket";
import { queryClient } from "@/lib/query-client";
import { useChatStore } from "@/store/chat.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";

const privateQueryKey = ["users", "@me", "private-data"];
const privateState = () => ({
  query: queryClient.getQueryData(privateQueryKey),
  reply: useChatStore.getState().replyDraft,
  notifications: useNotificationsStore.getState().notifications,
  owners: useOnlineCharacterOwnersStore.getState().ownersByCharacterKey,
});
const clearedState = {
  query: undefined,
  reply: null,
  notifications: [],
  owners: {},
};
function seedPrivateState() {
  queryClient.setQueryData(privateQueryKey, { secret: "old-account" });
  useChatStore.getState().setReplyDraft({
    guildId: "guild",
    messageId: "message",
    senderNick: "Player",
    message: "private reply",
    type: "NORMAL",
  });
  useNotificationsStore.getState().presentNotifications([
    {
      notification: {
        type: "chat-mention",
        notificationId: "notification",
        discordId: "123",
        guildId: "guild",
        world: "jaruna",
        createdAt: new Date().toISOString(),
        message: "private notification",
        servers: ["guild"],
      },
    },
  ]);
  useOnlineCharacterOwnersStore.setState({
    ownersByCharacterKey: {
      "account:character": {
        accountId: "account",
        characterId: "character",
        playerName: "Private Player",
        userId: "old-account",
      },
    },
  });
}

// Keep this integration test focused on the auth/socket lifecycle, not gameplay UI.
vi.mock("@/app-content", () => ({
  AppContent: () => <div>Gameplay overlay</div>,
}));

let restorePlatform: (() => void) | undefined;
afterEach(() => {
  disposeSocket();
  restorePlatform?.();
  restorePlatform = undefined;
  vi.restoreAllMocks();
});

describe("extension session lifecycle", () => {
  it("opens no socket without a session, starts after login and disconnects on confirmed logout", async () => {
    let userId: string | null = null;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(() =>
      Promise.resolve(
        Response.json(
          userId
            ? {
                user: {
                  id: userId,
                  name: "Player",
                  email: "player@example.test",
                  emailVerified: false,
                  discordId: "123",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                session: {
                  id: "session",
                  userId,
                  expiresAt: new Date(Date.now() + 60_000).toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              }
            : null,
        ),
      ),
    );
    const socket: RealtimeWebSocket = {
      readyState: 0,
      binaryType: "arraybuffer",
      addEventListener: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
    };
    const stateAtConnection: ReturnType<typeof privateState>[] = [];
    const factory = vi.fn(() => {
      stateAtConnection.push(privateState());
      return socket;
    });
    restorePlatform = configureGameClientPlatform({
      fetch: fetcher,
      createRealtime: () =>
        new RealtimeClient({
          url: "https://gateway.lootlog.pl",
          webSocketFactory: factory,
        }),
    });
    const view = render(<App />);
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    await screen.findByRole("link");
    expect(factory).not.toHaveBeenCalled();
    expect(screen.queryByText("Gameplay overlay")).toBeNull();

    userId = "first-user";
    act(() => {
      authClient.$store.notify("$sessionSignal");
    });
    await screen.findByText("Gameplay overlay");
    expect(factory).toHaveBeenCalledOnce();

    seedPrivateState();
    expect(privateState()).not.toEqual(clearedState);
    userId = "second-user";
    act(() => {
      authClient.$store.notify("$sessionSignal");
    });
    await waitFor(() => expect(factory).toHaveBeenCalledTimes(2));
    expect(stateAtConnection[1]).toEqual(clearedState);
    expect(screen.getByText("Gameplay overlay")).toBeInTheDocument();

    seedPrivateState();
    userId = null;
    act(() => {
      authClient.$store.notify("$sessionSignal");
    });
    await waitFor(() =>
      expect(screen.queryByText("Gameplay overlay")).toBeNull(),
    );
    expect(socket.close).toHaveBeenCalledWith(1000, "client disconnect");
    expect(factory).toHaveBeenCalledTimes(2);
    expect(privateState()).toEqual(clearedState);
    view.unmount();
  });

  it("keeps the userscript overlay available without a session", () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(null));
    const view = render(<App />);
    expect(screen.getByText("Gameplay overlay")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
    view.unmount();
  });
});
