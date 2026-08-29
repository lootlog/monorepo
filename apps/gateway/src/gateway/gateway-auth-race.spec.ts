import { HttpService } from "@nestjs/axios";
import { type INestApplication, Module } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { Test } from "@nestjs/testing";
import { io, type Socket as ClientSocket } from "socket.io-client";
import type { ServerOptions } from "socket.io";
import { Gateway } from "./gateway.js";
import { GatewayEvent } from "./enums/gateway-event.enum.js";
import { ConnectionService } from "./services/connection.service.js";
import { GatewayAuthService } from "./services/gateway-auth.service.js";
import { PresenceService } from "./services/presence.service.js";
import { SubscriptionService } from "./services/subscription.service.js";
import { MapPingService } from "./services/map-ping.service.js";
import { AirTagService } from "./services/air-tag.service.js";
import { RedisIoAdapter } from "#src/lib/redis/redis-io.adapter";

class TestRedisIoAdapter extends RedisIoAdapter {
  override createIOServer(port: number, options?: ServerOptions) {
    return IoAdapter.prototype.createIOServer.call(this, port, options);
  }
}

@Module({
  providers: [
    Gateway,
    GatewayAuthService,
    ConnectionService,
    { provide: HttpService, useValue: { get: vi.fn() } },
    {
      provide: PresenceService,
      useValue: {
        emitDisconnectPresence: vi.fn(),
        emitMemberWebPresenceUpdate: vi.fn(),
      },
    },
    {
      provide: SubscriptionService,
      useValue: {
        handleJoin: vi.fn().mockResolvedValue({ status: "success" }),
        handleDisconnect: vi.fn(),
      },
    },
    { provide: MapPingService, useValue: {} },
    { provide: AirTagService, useValue: {} },
  ],
})
class TestGatewayModule {}

describe("Gateway authentication ordering", () => {
  let app: INestApplication;
  let client: ClientSocket | undefined;

  afterEach(async () => {
    client?.disconnect();
    await app?.close();
  });

  it("does not expose JOIN until delayed connection authentication completes", async () => {
    let resolveIdentity!: (identity: {
      discordId: string;
      userId: string;
    }) => void;
    let markAuthenticationStarted!: () => void;
    const authenticationStarted = new Promise<void>((resolve) => {
      markAuthenticationStarted = resolve;
    });
    const identity = new Promise<{ discordId: string; userId: string }>(
      (resolve) => {
        resolveIdentity = resolve;
      },
    );

    const testingModule = await Test.createTestingModule({
      imports: [TestGatewayModule],
    }).compile();
    app = testingModule.createNestApplication();
    app.useWebSocketAdapter(new TestRedisIoAdapter(app));

    const gatewayAuthService = app.get(GatewayAuthService);
    vi.spyOn(gatewayAuthService, "verifyConnectionIdentity").mockImplementation(
      () => {
        markAuthenticationStarted();
        return identity;
      },
    );

    await app.listen(0);
    const address = app.getHttpServer().address();
    if (!address || typeof address === "string") {
      throw new Error("Expected the test gateway to listen on a TCP port");
    }

    const subscriptionService = app.get(SubscriptionService);
    const connected = new Promise<void>((resolve, reject) => {
      client = io(`http://127.0.0.1:${address.port}`, {
        transports: ["websocket"],
        extraHeaders: {
          cookie: "session=real",
          origin: "https://lootlog.com",
        },
      });
      client.on("connect", () => {
        client?.emit(GatewayEvent.JOIN, {});
        resolve();
      });
      client.on("connect_error", reject);
    });

    await authenticationStarted;
    const connectedBeforeAuthentication = await Promise.race([
      connected.then(() => true),
      new Promise<false>((resolve) => {
        setTimeout(() => resolve(false), 100);
      }),
    ]);
    if (connectedBeforeAuthentication) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 20);
      });
    }

    expect(vi.mocked(subscriptionService.handleJoin).mock.calls[0]).toBe(
      undefined,
    );
    expect(connectedBeforeAuthentication).toBe(false);

    resolveIdentity({ discordId: "discord-1", userId: "user-1" });
    await connected;
    await vi.waitFor(() => {
      expect(subscriptionService.handleJoin).toHaveBeenCalledTimes(1);
    });
    expect(subscriptionService.handleJoin).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "discord-1",
      "user-1",
      undefined,
      undefined,
    );
  });

  it.each([
    {
      description: "auth verification fails",
      headers: {
        cookie: "session=expired",
        origin: "https://lootlog.com",
      },
      stubVerification: true,
    },
    {
      description: "credentials are missing",
      headers: { origin: "https://lootlog.com" },
      stubVerification: false,
    },
  ])(
    "refuses the connection when $description",
    async ({ headers, stubVerification }) => {
      const testingModule = await Test.createTestingModule({
        imports: [TestGatewayModule],
      }).compile();
      app = testingModule.createNestApplication();
      app.useWebSocketAdapter(new TestRedisIoAdapter(app));

      if (stubVerification) {
        vi.spyOn(
          app.get(GatewayAuthService),
          "verifyConnectionIdentity",
        ).mockResolvedValue(null);
      }

      await app.listen(0);
      const address = app.getHttpServer().address();
      if (!address || typeof address === "string") {
        throw new Error("Expected the test gateway to listen on a TCP port");
      }

      const connectionError = new Promise<Error>((resolve) => {
        client = io(`http://127.0.0.1:${address.port}`, {
          transports: ["websocket"],
          reconnection: false,
          extraHeaders: headers,
        });
        client.on("connect_error", resolve);
      });

      await expect(connectionError).resolves.toMatchObject({
        message: "Unauthorized",
      });
      expect(client.connected).toBe(false);
      expect(app.get(SubscriptionService).handleJoin).not.toHaveBeenCalled();
    },
  );

  it("reauthenticates an automatic reconnect before handling JOIN again", async () => {
    const testingModule = await Test.createTestingModule({
      imports: [TestGatewayModule],
    }).compile();
    app = testingModule.createNestApplication();
    app.useWebSocketAdapter(new TestRedisIoAdapter(app));

    const gatewayAuthService = app.get(GatewayAuthService);
    const verifyConnectionIdentity = vi
      .spyOn(gatewayAuthService, "verifyConnectionIdentity")
      .mockResolvedValue({ discordId: "discord-1", userId: "user-1" });

    await app.listen(0);
    const address = app.getHttpServer().address();
    if (!address || typeof address === "string") {
      throw new Error("Expected the test gateway to listen on a TCP port");
    }

    const subscriptionService = app.get(SubscriptionService);
    client = io(`http://127.0.0.1:${address.port}`, {
      autoConnect: false,
      transports: ["websocket"],
      extraHeaders: {
        cookie: "session=real",
        origin: "https://lootlog.com",
      },
    });
    client.on("connect", () => client?.emit(GatewayEvent.JOIN, {}));

    client.connect();
    await vi.waitFor(() => {
      expect(subscriptionService.handleJoin).toHaveBeenCalledTimes(1);
    });

    client.io.engine?.close();
    await vi.waitFor(
      () => {
        expect(subscriptionService.handleJoin).toHaveBeenCalledTimes(2);
      },
      { timeout: 2_000 },
    );

    expect(verifyConnectionIdentity).toHaveBeenCalledTimes(2);
    for (const joinCall of vi.mocked(subscriptionService.handleJoin).mock
      .calls) {
      expect(joinCall[2]).toBe("discord-1");
      expect(joinCall[3]).toBe("user-1");
    }
  });
});
