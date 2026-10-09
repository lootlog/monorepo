import type {
  BasicPresence,
  PresenceConfidence,
  PresencePlatform,
  PresenceCharacter,
  SubscriptionScope,
} from "@lootlog/protocol/realtime";
import type { NpcPresenceNpc } from "@lootlog/schema/npc-presence";
import type { ApiKeyAccess } from "@lootlog/schema/api-key-access";
import type { UserGuildData } from "#src/guilds/guild";

export interface AuthenticatedIdentity {
  readonly discordId: string;
  readonly userId: string;
  apiKeyAccess?: ApiKeyAccess;
  apiKeyLeaseExpiresAt?: number;
}

export interface AirTagScope {
  readonly guildId: string;
  readonly world: string;
  readonly mapId: number;
  readonly subscription: typeof SubscriptionScope.Type;
}

/** The timer NPCs this socket last reported standing on its map. */
export interface NpcPresenceState {
  readonly world: string;
  readonly characterId: string;
  readonly organizationIds: readonly string[];
  readonly npcs: ReadonlyMap<number, NpcPresenceNpc>;
}

export interface SessionData extends AuthenticatedIdentity {
  readonly connectionId: string;
  readonly platform: typeof PresencePlatform.Type;
  readonly userAgent?: string;
  readonly supportsFeed?: boolean;
  /** Receives `loot.snapshot` in place of `loot.created`. */
  readonly supportsLootSnapshot?: boolean;
  readonly supportsSessionHello?: boolean;
  readonly supportsNotificationVolunteer?: boolean;
  readonly supportsPartyGatheringState?: boolean;
  readonly supportsBattlePings?: boolean;
  readonly supportsTeamBattlePings?: boolean;
  readonly supportsAirTagMapThreats?: boolean;
  readonly supportsAirTagScopeUpdates?: boolean;
  readonly supportsNpcPresence?: boolean;
  readonly supportsGlobalChat?: boolean;
  /** Decodes global chat moderation and stats, and follows per-world channels. */
  readonly supportsGlobalChatChannels?: boolean;
  readonly frameEncoding?: "json";
  joined: boolean;
  /** Set when the gateway will close the socket; it no longer acts on commands. */
  closing?: boolean;
  guilds: UserGuildData[];
  subscriptions: Map<string, typeof SubscriptionScope.Type>;
  airTagScopes: AirTagScope[];
  npcPresence?: NpcPresenceState;
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
}

export type GatewaySocket = Pick<
  Bun.ServerWebSocket<SessionData>,
  "data" | "send" | "close" | "getBufferedAmount"
>;

export const hasValidApiKeyLease = (
  session: AuthenticatedIdentity,
  now?: number,
): boolean => {
  if (session.apiKeyAccess === undefined) return true;
  const checkedAt = now ?? Date.now();

  return (
    session.apiKeyLeaseExpiresAt !== undefined &&
    session.apiKeyLeaseExpiresAt > checkedAt &&
    (session.apiKeyAccess.expiresAt === null ||
      Date.parse(session.apiKeyAccess.expiresAt) > checkedAt)
  );
};
