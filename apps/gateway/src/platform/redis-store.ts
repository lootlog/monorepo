import type { SubscriptionScope } from "@lootlog/protocol/realtime";
import { Redis } from "ioredis";
import type { GatewayConfiguration } from "#src/config/gateway-config";

export interface FederatedRealtimeMessage {
  readonly id: string;
  readonly sourceInstanceId: string;
  readonly scopeKey?: string;
  readonly scope?: typeof SubscriptionScope.Type;
  readonly scopes?: ReadonlyArray<typeof SubscriptionScope.Type>;
  readonly userId?: string;
  readonly discordId?: string;
  readonly excludeConnectionId?: string;
  readonly recipientPlatform?: "game" | "web-app";
  readonly recipientWorld?: string;
  readonly recipientMapId?: number;
  readonly presenceAudience?: "basic" | "precise";
  readonly organizationId?: string;
  readonly frame?: string;
  readonly control?: {
    readonly type: "permissions.rebalance";
    readonly discordId: string;
    readonly userId: string;
  };
}

export class RedisGatewayStore {
  readonly command: Redis;
  readonly publisher: Redis;
  readonly subscriber: Redis;
  readonly channel: string;

  constructor(config: GatewayConfiguration["redis"]) {
    const options = {
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      keyPrefix: `${config.keyPrefix}:`,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    } as const;
    this.command = new Redis(options);
    this.publisher = new Redis({ ...options, keyPrefix: undefined });
    this.subscriber = new Redis({ ...options, keyPrefix: undefined });
    this.channel = `${config.keyPrefix}:realtime:federation:v1`;
  }

  async connect(): Promise<void> {
    await Promise.all([
      this.command.connect(),
      this.publisher.connect(),
      this.subscriber.connect(),
    ]);
  }

  async close(): Promise<void> {
    await Promise.all([
      this.command.quit(),
      this.publisher.quit(),
      this.subscriber.quit(),
    ]);
  }

  async publish(message: FederatedRealtimeMessage): Promise<void> {
    await this.publisher.publish(this.channel, JSON.stringify(message));
  }

  async subscribe(
    listener: (message: FederatedRealtimeMessage) => void,
  ): Promise<void> {
    this.subscriber.on("message", (_channel: string, raw: string) => {
      try {
        const message = JSON.parse(raw) as FederatedRealtimeMessage;
        if (
          typeof message.id === "string" &&
          typeof message.sourceInstanceId === "string" &&
          (typeof message.frame === "string" ||
            message.control?.type === "permissions.rebalance")
        ) {
          listener(message);
        }
      } catch {
        // Malformed federation frames are isolated to Redis and never reach clients.
      }
    });
    await this.subscriber.subscribe(this.channel);
  }
}
