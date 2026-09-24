// @vitest-environment happy-dom

import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
} from "@lootlog/client/main";
import type { RealtimeWebSocket } from "@lootlog/client/realtime";
import {
  decodeRealtimeFrame,
  encodeRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import { socket } from "@/lib/gateway-client";
import { createUserPreferences } from "@/lib/testing/preferences";
import { GatewayProvider } from "./gateway-provider";

type Listener = Parameters<RealtimeWebSocket["addEventListener"]>[1];

class Wire implements RealtimeWebSocket {
  binaryType: BinaryType = "arraybuffer";
  readyState = 0;
  static instances: Wire[] = [];
  readonly frames: ReturnType<typeof decodeRealtimeFrame>[] = [];
  private readonly listeners = new Map<string, Listener>();
  constructor() {
    Wire.instances.push(this);
  }
  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, listener);
  }
  open() {
    this.readyState = 1;
    this.listeners.get("open")?.({});
  }
  close() {
    this.readyState = 3;
    this.listeners.get("close")?.({});
  }
  send(bytes: string | Uint8Array) {
    if (!(bytes instanceof Uint8Array)) throw new Error("Expected MessagePack");
    const command = decodeRealtimeFrame(bytes);
    this.frames.push(command);

    if (!("requestId" in command) || !command.requestId)
      throw new Error("Expected request");
    const requestId = command.requestId;
    queueMicrotask(() => {
      this.listeners.get("message")?.({
        data: encodeRealtimeFrame({
          v: 1,
          requestId,
          status: "success",
          data: { sessionId: "presence-1" },
        }),
      });

      if ("type" in command && command.type === "session.join")
        this.listeners.get("message")?.({
          data: encodeRealtimeFrame({
            v: 1,
            type: "session.joined",
            data: {
              connectionId: "connection-1",
              organizationIds: ["guild-1"],
              subscriptionScopes: [],
            },
          }),
        });
    });
  }
}

const wireAt = (index: number) => {
  const wire = Wire.instances[index];

  if (!wire) throw new Error(`Missing wire ${index}`);

  return wire;
};

const setup = async (openDuringCommit = false) => {
  vi.stubGlobal("WebSocket", Wire);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  onTestFinished(() => client.clear());
  client.setQueryData(sessionQueryOptions.queryKey, {
    data: {
      user: {
        id: "user-1",
        discordId: "discord-1",
        name: "Member",
        email: "member@example.test",
        emailVerified: true,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
      session: {
        id: "session-1",
        userId: "user-1",
        token: "fixture-token",
        expiresAt: new Date("2099-01-01"),
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
    },
    error: null,
  });
  client.setQueryData(
    getUsersControllerGetUserPreferencesQueryKey(),
    createUserPreferences(),
  );
  client.setQueryData(
    getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
    [{ id: "guild-1", vanityUrl: null }],
  );
  socket.connect();

  const root = createRootRoute({
    component: () => (
      <GatewayProvider>
        <div
          ref={(element) => {
            if (element && openDuringCommit) wireAt(0).open();
          }}
        />
      </GatewayProvider>
    ),
  });

  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  await router.load();
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

afterEach(() => {
  cleanup();
  socket.disconnect();
  vi.unstubAllGlobals();
  Wire.instances = [];
});

it("restores the real provider session and presence exactly once after reconnect", async () => {
  await setup();
  act(() => wireAt(0).open());
  await waitFor(() =>
    expect(
      wireAt(0).frames.filter(
        (frame) => "type" in frame && frame.type === "presence.publish",
      ),
    ).toHaveLength(1),
  );
  expect(
    wireAt(0).frames.filter(
      (frame) => "type" in frame && frame.type === "session.join",
    ),
  ).toHaveLength(1);
  act(() => wireAt(0).close());
  act(() => {
    socket.connect();
    wireAt(1).open();
  });
  await waitFor(() =>
    expect(
      wireAt(1).frames.filter(
        (frame) => "type" in frame && frame.type === "presence.publish",
      ),
    ).toHaveLength(1),
  );
  expect(
    wireAt(1).frames.filter(
      (frame) => "type" in frame && frame.type === "session.join",
    ),
  ).toHaveLength(1);
});

it("joins when the transport opens between provider render and passive effects", async () => {
  await setup(true);
  await waitFor(() =>
    expect(
      wireAt(0).frames.filter(
        (frame) => "type" in frame && frame.type === "presence.publish",
      ),
    ).toHaveLength(1),
  );
  expect(
    wireAt(0).frames.filter(
      (frame) => "type" in frame && frame.type === "session.join",
    ),
  ).toHaveLength(1);
});
