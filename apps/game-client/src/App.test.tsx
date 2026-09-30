import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RealtimeClient,
  type RealtimeWebSocket,
} from "@lootlog/client/realtime";
import { createNativeRuntime } from "@/test/native-runtime";
import { RealtimeWire } from "@/test/realtime-wire";
import { useGameStore } from "@/store/game.store";

vi.stubGlobal("Engine", createNativeRuntime());

const { default: App } = await import("./App");

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

const sessionFor = (userId: string | null) =>
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
    : null;

let restorePlatform: (() => void) | undefined;

afterEach(() => {
  disposeSocket();
  restorePlatform?.();
  restorePlatform = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.stubGlobal("Engine", createNativeRuntime());
});

describe("extension session lifecycle", () => {
  it("opens no socket without a session, starts after login and disconnects on confirmed logout", async () => {
    let userId: string | null = null;

    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(() =>
        Promise.resolve(Response.json(sessionFor(userId))),
      );

    const socket: RealtimeWebSocket = {
      readyState: 0,
      binaryType: "arraybuffer",
      addEventListener: vi.fn<RealtimeWebSocket["addEventListener"]>(),
      send: vi.fn<RealtimeWebSocket["send"]>(),
      close: vi.fn<RealtimeWebSocket["close"]>(),
    };

    const stateAtConnection: ReturnType<typeof privateState>[] = [];

    const factory = vi.fn<() => RealtimeWebSocket>(() => {
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
    expect(useGameStore.getState().game).toBeNull();

    userId = "first-user";
    act(() => {
      authClient.$store.notify("$sessionSignal");
    });
    await waitFor(() =>
      expect(useGameStore.getState().game?.hero.name).toBe("Tester"),
    );
    expect(factory).toHaveBeenCalledOnce();

    seedPrivateState();
    expect(privateState()).not.toEqual(clearedState);
    userId = "second-user";
    act(() => {
      authClient.$store.notify("$sessionSignal");
    });
    await waitFor(() => expect(factory).toHaveBeenCalledTimes(2));
    expect(stateAtConnection[1]).toEqual(clearedState);
    expect(useGameStore.getState().game?.hero.name).toBe("Tester");

    seedPrivateState();
    userId = null;
    act(() => {
      authClient.$store.notify("$sessionSignal");
    });
    await waitFor(() => expect(useGameStore.getState().game).toBeNull());
    expect(socket.close).toHaveBeenCalledWith(1000, "client disconnect");
    expect(factory).toHaveBeenCalledTimes(2);
    expect(privateState()).toEqual(clearedState);
    view.unmount();
  });

  it("keeps the initial userscript connection and clears private state on confirmed logout and account switch", async () => {
    vi.stubGlobal("Engine", createNativeRuntime());
    const initial = Promise.withResolvers<Response>();
    let userId: string | null = "userscript-first";
    let initialRead = true;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = input instanceof Request ? input.url : String(input);

      if (!url.includes("get-session")) return Response.json(null);

      if (initialRead) {
        initialRead = false;

        return initial.promise;
      }

      return Response.json(sessionFor(userId));
    });
    const wires: RealtimeWire[] = [];
    vi.stubGlobal(
      "WebSocket",
      class extends RealtimeWire {
        constructor() {
          super();
          wires.push(this);
        }
      },
    );
    // A fresh page load starts with the session read still pending.
    act(() =>
      authClient.$store.atoms.session.set({
        ...authClient.$store.atoms.session.get(),
        data: null,
        isPending: true,
      }),
    );
    act(() => authClient.$store.notify("$sessionSignal"));
    const view = render(<App />);
    await waitFor(() => expect(wires).toHaveLength(1));
    const marker = ["initial-userscript-session"];
    queryClient.setQueryData(marker, "kept");
    await act(async () => {
      initial.resolve(Response.json(sessionFor(userId)));
    });
    await waitFor(() =>
      expect(authClient.$store.atoms.session.get().data?.user.id).toBe(
        "userscript-first",
      ),
    );
    expect(wires).toHaveLength(1);
    expect(queryClient.getQueryData(marker)).toBe("kept");
    seedPrivateState();
    userId = "userscript-second";
    act(() => authClient.$store.notify("$sessionSignal"));
    await waitFor(() => expect(wires).toHaveLength(2));
    expect(wires[0]?.readyState).toBe(3);
    expect(privateState()).toEqual(clearedState);
    seedPrivateState();
    userId = null;
    act(() => authClient.$store.notify("$sessionSignal"));
    await waitFor(() => expect(wires[1]?.readyState).toBe(3));
    expect(privateState()).toEqual(clearedState);
    expect(wires).toHaveLength(2);
    // A confirmed logout sends the player to sign in again on the website.
    expect(
      await screen.findByRole("link", { name: "Otwórz stronę Lootloga" }),
    ).toBeInTheDocument();
    view.unmount();
  });

  it("keeps the userscript overlay available without a session, offers sign-in and stops its socket", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(null));
    const wires: RealtimeWire[] = [];
    vi.stubGlobal(
      "WebSocket",
      class extends RealtimeWire {
        constructor() {
          super();
          wires.push(this);
        }
      },
    );
    act(() => authClient.$store.notify("$sessionSignal"));
    const view = render(<App />);
    expect(useGameStore.getState().game?.hero.name).toBe("Tester");
    await screen.findByRole("region", { name: "Logowanie do Lootloga" });
    expect(useGameStore.getState().game?.hero.name).toBe("Tester");
    await waitFor(() =>
      expect(wires.every((wire) => wire.readyState === 3)).toBe(true),
    );
    view.unmount();
  });
});
