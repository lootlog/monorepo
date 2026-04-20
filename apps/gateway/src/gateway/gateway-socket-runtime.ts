import type { Server as HttpServer } from "node:http";
import { RuntimeEnvironment } from "@lootlog/types";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { Server as SocketIOServer } from "socket.io";
import { msgpackParser } from "@lootlog/socket-parser";
import { APP_CONFIG } from "../config/env.js";
import { ErrorMessages } from "./constants/error-messages.constant.js";
import { GatewayConfig } from "./constants/gateway-config.constant.js";
import type { JoinGatewayDto } from "./dto/join-gateway.dto.js";
import type { RequestPlayerPresenceDto } from "./dto/request-player-presence.dto.js";
import type { RequestServerPresenceDto } from "./dto/request-server-presence.dto.js";
import type { EventPresenceUpdateDto } from "./dto/event-presence-update.dto.js";
import { GatewayEvent } from "./enums/gateway-event.enum.js";
import { ResponseStatus } from "./enums/response-status.enum.js";
import { ConnectionService } from "./services/connection.service.js";
import { PresenceService } from "./services/presence.service.js";
import { SubscriptionService } from "./services/subscription.service.js";
import { SocketServerRef } from "./socket-server-ref.js";
import type { Socket } from "./types/socket-user.type.js";

type LoggerLike = {
  error(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
};

type AcknowledgeFn = (payload: unknown) => void;

export interface GatewaySocketRuntimeOptions {
  connectionService: ConnectionService;
  httpServer: HttpServer;
  logger: LoggerLike;
  presenceService: PresenceService;
  socketServerRef: SocketServerRef;
  subscriptionService: SubscriptionService;
}

export class GatewaySocketRuntime {
  private readonly pubClient;
  private readonly subClient;
  private io: SocketIOServer | null = null;

  constructor(private readonly options: GatewaySocketRuntimeOptions) {
    this.pubClient = new Redis({
      host: APP_CONFIG.redis.host,
      port: APP_CONFIG.redis.port,
      password: APP_CONFIG.redis.password || undefined,
      username: APP_CONFIG.redis.username || undefined,
    });
    this.subClient = this.pubClient.duplicate();

    this.attachRedisErrorLogger(
      this.pubClient,
      "Gateway socket Redis publisher error",
    );
    this.attachRedisErrorLogger(
      this.subClient,
      "Gateway socket Redis subscriber error",
    );
  }

  async start(): Promise<void> {
    if (this.io !== null) {
      return;
    }

    const io = new SocketIOServer(this.options.httpServer, {
      parser: msgpackParser,
      pingInterval: GatewayConfig.SOCKET_PING_INTERVAL_MS,
      pingTimeout: GatewayConfig.SOCKET_PING_TIMEOUT_MS,
    });
    io.adapter(createAdapter(this.pubClient, this.subClient));

    const gatewayNamespace =
      APP_CONFIG.env === RuntimeEnvironment.LOCAL
        ? io.of("/gateway")
        : io.of("/");

    this.options.socketServerRef.set(gatewayNamespace);
    gatewayNamespace.on("connection", (client) => {
      void this.handleConnection(client as Socket);
    });

    this.io = io;

    this.options.logger.info("Gateway socket runtime started", {
      namespace: gatewayNamespace.name,
    });
  }

  async close(): Promise<void> {
    if (this.io !== null) {
      await new Promise<void>((resolve) => {
        this.io?.close(() => {
          resolve();
        });
      });
      this.io = null;
    }

    await Promise.allSettled([this.pubClient.quit(), this.subClient.quit()]);
  }

  private attachRedisErrorLogger(client: Redis, message: string): void {
    client.on("error", (error) => {
      this.options.logger.error(message, { error });
    });
  }

  private getAck(callback?: unknown): AcknowledgeFn | undefined {
    if (typeof callback !== "function") {
      return undefined;
    }

    return callback as AcknowledgeFn;
  }

  private respond(
    client: Socket,
    event: GatewayEvent,
    payload: unknown,
    ack?: AcknowledgeFn,
  ) {
    if (ack) {
      ack(payload);
      return;
    }

    client.emit(event, payload);
  }

  private async handleConnection(client: Socket): Promise<void> {
    const { discordId, platform, userId } =
      this.options.connectionService.getConnectionMetadata(client.request);

    const validation = this.options.connectionService.validateConnection(
      discordId,
      platform,
    );
    if (!validation.valid || discordId === null) {
      client.disconnect(true);
      return;
    }

    client.data = this.options.connectionService.initializeSocketData(
      discordId,
      userId,
      client.id,
      platform,
    );

    client.on(GatewayEvent.DISCONNECTING, () => {
      void this.handleDisconnecting(client);
    });

    client.on(
      GatewayEvent.JOIN,
      (payload: JoinGatewayDto, callback?: unknown) => {
        void this.handleJoin(client, payload, callback);
      },
    );
    client.on(
      GatewayEvent.REQUEST_SERVER_PRESENCE,
      (payload: RequestServerPresenceDto, callback?: unknown) => {
        void this.handleRequestServerPresence(client, payload, callback);
      },
    );
    client.on(
      GatewayEvent.PRESENCE_UPDATE,
      (payload: EventPresenceUpdateDto) => {
        this.handlePresenceUpdate(client, payload);
      },
    );
    client.on(
      GatewayEvent.PRESENCE_FETCH,
      (payload: RequestPlayerPresenceDto, callback?: unknown) => {
        void this.handlePresenceFetch(client, payload, callback);
      },
    );
  }

  private async handleDisconnecting(client: Socket): Promise<void> {
    if (!client.data.discordId) {
      return;
    }

    this.options.presenceService.emitDisconnectPresence(client);

    if (!client.data.guilds) {
      return;
    }

    await this.options.subscriptionService.handleDisconnect(
      client,
      client.data.guilds,
    );
    await this.options.presenceService.broadcastPlayerDisconnect(
      this.options.socketServerRef.get(),
      client,
    );
  }

  private async handleJoin(
    client: Socket,
    payload: JoinGatewayDto,
    callback?: unknown,
  ): Promise<void> {
    const discordId = client.data.discordId;
    const userId = client.data.userId;

    if (!discordId || !userId) {
      const result = {
        status: ResponseStatus.ERROR,
        message: ErrorMessages.JOIN_FAILED,
      };
      client.emit(GatewayEvent.JOIN, result);
      const ack = this.getAck(callback);
      if (ack) {
        ack(result);
      }
      return;
    }

    const result = await this.options.subscriptionService.handleJoin(
      this.options.socketServerRef.get(),
      client,
      discordId,
      userId,
      payload?.data,
    );

    client.emit(GatewayEvent.JOIN, result);
  }

  private async handleRequestServerPresence(
    client: Socket,
    payload: RequestServerPresenceDto,
    callback?: unknown,
  ): Promise<void> {
    const ack = this.getAck(callback);
    const result = await this.options.presenceService.fetchServerPresence(
      this.options.socketServerRef.get(),
      client,
      payload.guildId,
      payload.world,
    );

    this.respond(client, GatewayEvent.REQUEST_SERVER_PRESENCE, result, ack);
  }

  private handlePresenceUpdate(
    client: Socket,
    payload: EventPresenceUpdateDto,
  ): void {
    const discordId = client.data.discordId;
    if (!discordId) {
      this.options.logger.warn("Skipping presence update without discordId");
      return;
    }

    this.options.presenceService.updatePlayerPresence(
      client,
      discordId,
      payload,
      this.options.socketServerRef.get(),
    );
  }

  private async handlePresenceFetch(
    client: Socket,
    payload: RequestPlayerPresenceDto,
    callback?: unknown,
  ): Promise<void> {
    const ack = this.getAck(callback);
    const result = await this.options.presenceService.fetchGuildPresence(
      this.options.socketServerRef.get(),
      client,
      payload.guildId,
      payload.world,
    );

    this.respond(client, GatewayEvent.PRESENCE_FETCH, result, ack);
  }
}
