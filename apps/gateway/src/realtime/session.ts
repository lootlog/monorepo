import type {
  BasicPresence,
  PresenceConfidence,
  PresencePlatform,
  PresenceCharacter,
  SubscriptionScope,
} from "@lootlog/protocol/realtime";
import type { UserGuildData } from "#src/guilds/guild";

export interface AuthenticatedIdentity {
  readonly discordId: string;
  readonly userId: string;
}

export interface AirTagScope {
  readonly guildId: string;
  readonly world: string;
  readonly mapId: number;
  readonly subscription: typeof SubscriptionScope.Type;
}

export interface SessionData extends AuthenticatedIdentity {
  readonly connectionId: string;
  readonly platform: typeof PresencePlatform.Type;
  readonly userAgent?: string;
  joined: boolean;
  guilds: UserGuildData[];
  subscriptions: Map<string, typeof SubscriptionScope.Type>;
  airTagScopes: AirTagScope[];
  character?: typeof PresenceCharacter.Type;
  confidence: typeof PresenceConfidence.Type;
  presence?: typeof BasicPresence.Type & {
    readonly location?: {
      readonly mapId?: number;
      readonly map: string;
      readonly x?: number;
      readonly y?: number;
    };
  };
  backpressureStrikes: number;
}

export type GatewaySocket = Bun.ServerWebSocket<SessionData>;
