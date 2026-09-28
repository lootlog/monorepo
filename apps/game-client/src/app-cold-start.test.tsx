import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { RealtimeClient } from "@lootlog/client/realtime";
import { configureApiClients } from "@lootlog/client/transport";
import { createAccessPolicySnapshot } from "@lootlog/protocol/realtime/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { SETTINGS_DOMAINS } from "@lootlog/schema/settings-documents";
import { createNativeRuntime } from "@/test/native-runtime";
import { RealtimeWire } from "@/test/realtime-wire";
import { createSettingsDocuments } from "@/test/settings-documents-fixtures";
import {
  createNotificationsSettings,
  createDetectorSettings,
} from "@/lib/game-account-preferences";
import { configureGameClientPlatform } from "@/lib/game-client-platform";
import { disposeSocket } from "@/lib/socket";
import { queryClient } from "@/lib/query-client";
import { useGlobalStore } from "@/store/global.store";
import { useWindowsStore } from "@/store/windows.store";
import { markSettingsImportDone } from "@/features/settings/persistence/settings-import";
import { MARGONEM_ACCOUNT_VALIDATE_URL } from "@/config/api";
import { REALTIME_ACTIVE_PARTY_GATHERINGS_CAPABILITY } from "@lootlog/protocol/realtime";
import { SocketProvider } from "@/contexts/socket-context";

vi.stubGlobal("Engine", createNativeRuntime());

const { AppContent } = await import("./app-content");

afterEach(() => {
  cleanup();
  disposeSocket();
  queryClient.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("starts an initialized character without repeating HTTP snapshots or joining twice", async () => {
  queryClient.clear();
  useGlobalStore.setState({ gameState: { gameInitialized: false } });
  useWindowsStore.getState().setOpen("chat", true);
  useWindowsStore.getState().setOpen("timers", true);

  for (const domain of SETTINGS_DOMAINS) markSettingsImportDone(domain);

  const documents = createSettingsDocuments({
    "notifications.presentation": createNotificationsSettings(["guild-1"]),
    "gameData.detector": createDetectorSettings(),
    "gameData.airTags": { enabled: true },
  });

  const requests: string[] = [];
  const unexpected: string[] = [];

  const http: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname);
    requests.push(`${request.method} ${path}`);
    await new Promise((resolve) => setTimeout(resolve, 20));

    if (path.endsWith("/get-session"))
      return Response.json({
        user: {
          id: "user",
          discordId: "discord-1",
          name: "Tester",
          email: "member@example.test",
          emailVerified: true,
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
      });

    if (path === "/users/@me/guilds/accessible")
      return Response.json([
        {
          id: "guild-1",
          name: "Test guild",
          icon: null,
          ownerId: "discord-1",
          publicStatsCardEnabled: false,
          hasLootlogAccess: true,
          isAccessDataStale: false,
        },
      ]);

    if (path === "/users/@me/preferences")
      return Response.json({
        userId: "user",
        guildsOrder: ["guild-1"],
        hiddenGuildIds: [],
        theme: "default",
        chatAppearance: {
          npcLayout: "tile",
          fontScalePercent: 100,
          messageGapPx: 4,
          showTimestamp: true,
          showGuildLabel: true,
          showNpcAvatar: true,
          showNpcLevel: true,
          showNpcLocationAndCoordinates: true,
        },
        mutes: { players: [], npcs: [] },
      });

    if (path === "/users/@me/lootlog-config/accounts/202")
      return Response.json({});

    if (path === "/preferences") return Response.json(documents);

    if (path === "/preferences/guilds")
      return Response.json({
        guilds: { "guild-1": createSettingsDocuments() },
      });

    if (path.endsWith("/members/@me")) return Response.json(null);

    if (
      path === "/timers" ||
      path === "/messaging/party-gathering" ||
      path === "/messaging/party-gathering/active" ||
      path.endsWith("/chat-messages") ||
      path.endsWith("/members/summary")
    )
      return Response.json([]);
    unexpected.push(`${request.method} ${path}`);

    return new Response(null, { status: 400 });
  };

  const proofRequests: string[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const request = new Request(input, init);

    if (request.url !== MARGONEM_ACCOUNT_VALIDATE_URL)
      throw new Error(`Unexpected external request: ${request.url}`);
    proofRequests.push(request.url);
    const token = new URLSearchParams(await request.text()).get("token");

    return Response.json({
      user_id: "202",
      token,
      ts: 1700000000,
      validatedString: `202+${token}+1700000000`,
      signatureBase64: "signature",
    });
  });
  const wire = new RealtimeWire();

  const webSocketFactory = vi.fn(() => wire);

  const realtime = new RealtimeClient({
    url: "https://gateway.example.test",
    webSocketFactory,
  });

  const accessPolicy = createAccessPolicySnapshot(
    [
      {
        guild: { id: "guild-1", ownerId: "discord-1" },
        roles: [
          {
            permissions: Object.values(Permission),
            lvlRangeFrom: 0,
            lvlRangeTo: 500,
          },
        ],
      },
    ],
    "discord-1",
  );

  const send = wire.send.bind(wire);
  vi.spyOn(wire, "send").mockImplementation((bytes) => {
    send(bytes);
    const frame = wire.frames.at(-1);

    if (
      !frame ||
      !("type" in frame) ||
      !("requestId" in frame) ||
      !frame.requestId
    )
      throw new Error("Expected command");
    const requestId = frame.requestId;

    const data =
      frame.type === "session.join"
        ? {
            connectionId: "cold-start",
            organizationIds: ["guild-1"],
            accessPolicy,
            capabilities: [
              "connection.ping",
              REALTIME_ACTIVE_PARTY_GATHERINGS_CAPABILITY,
            ],
          }
        : { presences: [] };

    queueMicrotask(() =>
      wire.receive({ v: 1, requestId, status: "success", data }),
    );
  });

  const restorePlatform = configureGameClientPlatform({
    fetch: http,
    createRealtime: () => realtime,
  });

  const restoreApi = configureApiClients({
    main: { baseUrl: "https://api.example.test", fetch: http },
  });

  try {
    render(
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <AppContent />
        </SocketProvider>
      </QueryClientProvider>,
    );
    act(() => {
      wire.open();
      wire.receive({
        v: 1,
        type: "session.hello",
        data: { connectionId: "cold-start" },
      });
    });
    await waitFor(() =>
      expect(useGlobalStore.getState().socketState.joined).toBe(true),
    );

    await waitFor(() =>
      expect(requests).toContain("GET /messaging/party-gathering/active"),
    );
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5_100));
    });

    const commands = wire.frames.flatMap((frame) =>
      "type" in frame ? [frame.type] : [],
    );

    if (process.env.LOOTLOG_COLD_START_REPORT)
      process.stdout.write(
        `${JSON.stringify({ requests, commands, proofRequests: proofRequests.length, webSocketConnections: webSocketFactory.mock.calls.length })}\n`,
      );
    expect(unexpected).toEqual([]);
    expect(webSocketFactory).toHaveBeenCalledTimes(1);
    expect(proofRequests).toHaveLength(1);
    expect(requests).toHaveLength(11);
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .flatMap((query) => (query.state.error ? [query.state.error] : [])),
    ).toEqual([]);
    expect(commands.filter((type) => type === "presence.publish")).toHaveLength(
      1,
    );
    expect(
      requests.filter((path) => path.endsWith("/chat-messages")),
    ).toHaveLength(1);
    expect(commands.filter((type) => type === "session.join")).toHaveLength(1);
    expect(requests.filter((path) => path === "GET /timers")).toHaveLength(1);
    expect(
      requests.filter((path) => path === "GET /users/@me/guilds/accessible"),
    ).toHaveLength(1);
    expect(
      requests.filter((path) => path === "GET /messaging/party-gathering"),
    ).toHaveLength(1);
    expect(
      requests.filter(
        (path) => path === "GET /messaging/party-gathering/active",
      ),
    ).toHaveLength(1);
  } finally {
    cleanup();
    disposeSocket();
    restorePlatform();
    restoreApi();
  }
}, 15_000);
