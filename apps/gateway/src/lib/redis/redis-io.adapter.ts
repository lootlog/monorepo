import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import type { INestApplication } from "@nestjs/common";
import type { ServerOptions } from "socket.io";
import { msgpackParser } from "@lootlog/socket-parser";
import { redisConfig } from "src/config/redis.config";

const SOCKET_IO_REDIS_REQUESTS_TIMEOUT = 30000;

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(app: INestApplication) {
    super(app);
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
