import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import type { INestApplication } from "@nestjs/common";
import type { Server, ServerOptions } from "socket.io";
import { msgpackParser } from "@lootlog/socket-parser";
import { redisConfig } from "#src/config/redis.config";
import { GatewayAuthService } from "#src/gateway/services/gateway-auth.service";
import type { Socket } from "#src/gateway/types/socket-user.type";

const SOCKET_IO_REDIS_REQUESTS_TIMEOUT = 30000;

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private readonly gatewayAuthService: GatewayAuthService;

  constructor(app: INestApplication) {
    // Pass the actual HTTP server instead of relying on Nest's instanceof
    // detection, which is not stable across pnpm peer-dependency instances.
    super(app.getHttpServer());
    this.gatewayAuthService = app.get(GatewayAuthService);
  }

  override bindClientConnect(
    server: Server,
    callback: (client: Socket) => void,
  ): void {
    server.use((client, next) => {
      void this.gatewayAuthService
        .authenticateConnection(client as Socket)
        .then((authenticated) => {
          if (authenticated) {
            next();
            return;
          }

          next(new Error("Unauthorized"));
        })
        .catch(() => next(new Error("Unauthorized")));
    });

    super.bindClientConnect(server, callback);
  }

  async connectToRedis(): Promise<void> {
    const pubClient = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      username: redisConfig.username,
    });

    const subClient = pubClient.duplicate();

    this.adapterConstructor = createAdapter(pubClient, subClient, {
      requestsTimeout: SOCKET_IO_REDIS_REQUESTS_TIMEOUT,
      publishOnSpecificResponseChannel: true,
    });
  }

  createIOServer(port: number, options?: ServerOptions) {
    const serverOptions: ServerOptions = {
      ...options,
      parser: msgpackParser,
    };
    const server = super.createIOServer(port, serverOptions);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
