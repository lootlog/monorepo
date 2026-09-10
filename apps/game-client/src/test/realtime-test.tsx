import { act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { onTestFinished, vi } from "vitest";
import { RealtimeClient } from "@lootlog/client/realtime";
import type { AccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import type { ServerEvent } from "@lootlog/protocol/realtime";
import { configureApiClients } from "@lootlog/client/transport";
import { authClient } from "@/lib/auth-client";
import { createSoundSettings } from "@/test/sound-settings-fixtures";
import { SocketProvider } from "@/contexts/socket-context";
import { configureGameClientPlatform } from "@/lib/game-client-platform";
import { disposeSocket, getSocket } from "@/lib/socket";
import { queryClient } from "@/lib/query-client";
import { RealtimeWire } from "@/test/realtime-wire";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useGlobalStore } from "@/store/global.store";
import { useNotificationsStore } from "@/store/notifications.store";

export const createRealtimeTest = () => {
  disposeSocket();
  queryClient.clear();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  useGlobalStore.setState({ gameState: { gameInitialized: false } });
  useNotificationsStore.getState().clearNotifications();
  setTestRuntimeGame({
    hero: {
      accountId: "1",
      characterId: "1",
      name: "Current Hero",
      level: 300,
    },
  });
  const wire = new RealtimeWire();

  const realtime = new RealtimeClient({
    url: "https://gateway.example.test",
    webSocketFactory: () => wire,
  });

  const memberRequest = vi
    .fn<typeof fetch>()
    .mockImplementation(() => Promise.resolve(Response.json(null)));

  const requests: string[] = [];
  let sessionDiscordId: string | null = null;
  const soundSettings = createSoundSettings();

  const externalFetch = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation((input) => {
      const url = input instanceof Request ? input.url : String(input);

      if (url.startsWith("https://public-api.margonem.pl/account/validate"))
        return Promise.resolve(
          Response.json({ error: "No game session in test" }, { status: 503 }),
        );

      return Promise.reject(new Error(`Unexpected external fetch: ${url}`));
    });

  const http: typeof fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    requests.push(url.pathname);

    if (url.pathname.endsWith("/get-session"))
      return Response.json(
        sessionDiscordId
          ? {
              user: {
                id: "user",
                name: "Current member",
                email: "member@example.test",
                emailVerified: true,
                discordId: sessionDiscordId,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
              session: {
                id: "session",
                userId: "user",
                expiresAt: "2099-01-01T00:00:00.000Z",
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            }
          : null,
      );

    if (url.pathname === "/sound-settings") return Response.json(soundSettings);

    if (url.pathname === "/preferences") return Response.json({ domains: {} });

    if (url.pathname.endsWith("/members/summary")) return Response.json([]);

    if (url.pathname.endsWith("/members/@me"))
      return await memberRequest(input, init);
    throw new Error(`Unexpected HTTP request: ${url.pathname}`);
  };

  const restorePlatform = configureGameClientPlatform({
    fetch: http,
    createRealtime: () => realtime,
  });

  const restoreApi = configureApiClients({
    main: { baseUrl: "https://api.example.test", fetch: http },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>{children}</SocketProvider>
    </QueryClientProvider>
  );

  const receive = async (...events: ServerEvent[]) => {
    if (events.length === 0) return;
    await act(async () => {
      const received = Promise.withResolvers<void>();
      let remaining = events.length;

      const unsubscribe = realtime.subscribe(() => {
        remaining -= 1;

        if (remaining === 0) received.resolve();
      });

      events.forEach((event) => wire.receive(event));
      await received.promise;
      unsubscribe();
    });
  };

  const open = () => act(() => wire.open());

  const join = async (
    organizationIds = ["guild-1"],
    accessPolicy?: AccessPolicySnapshot,
  ) => {
    await act(async () => {
      const joined = getSocket().join({
        world: "pandora",
        name: "Current Hero",
        lvl: 300,
        icon: "hero.gif",
        characterId: "1",
        accountId: "1",
        prof: "w",
      });

      const request = wire.frames.findLast(
        (frame) => "type" in frame && frame.type === "session.join",
      );

      if (!request || !("requestId" in request) || !request.requestId)
        throw new Error("Expected join request");
      wire.receive({
        v: 1,
        requestId: request.requestId,
        status: "success",
        data: { connectionId: "test", organizationIds, accessPolicy },
      });
      await joined;
    });
  };

  onTestFinished(() => {
    externalFetch.mockRestore();
    disposeSocket();
    restorePlatform();
    restoreApi();
    queryClient.clear();
    useNotificationsStore.getState().clearNotifications();
  });

  const setSessionDiscordId = (id: string | null) => {
    sessionDiscordId = id;
    authClient.$store.notify("$sessionSignal");
  };

  return {
    setSessionDiscordId,
    wrapper,
    queryClient,
    wire,
    realtime,
    requests,
    memberRequest,
    receive,
    open,
    join,
  };
};
