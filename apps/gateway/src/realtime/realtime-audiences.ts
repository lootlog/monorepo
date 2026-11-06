import type { SubscriptionScope } from "@lootlog/protocol/realtime";
import type { FederatedRealtimeMessage } from "#src/platform/redis-store";
import type { GatewaySocket, SessionData } from "#src/realtime/session";

type Scope = typeof SubscriptionScope.Type;

/** Identifies a scope; JSON keeps field values that contain delimiters apart. */
export const getScopeKey = (scope: Scope): string =>
  JSON.stringify([
    scope.topic,
    scope.organizationId,
    scope.eventId,
    scope.world,
    scope.mapId,
  ]);

const getIdentityAudienceKey = (kind: "user" | "discord", id: string): string =>
  JSON.stringify([kind, id]);

const getLocationAudienceKey = (
  platform: SessionData["platform"],
  world: string,
  mapId: number,
): string => JSON.stringify(["recipient-location", platform, world, mapId]);

// Candidate selection and scope visibility both match a delivered scope.
const scopeAudienceKeys = new WeakMap<Scope, string[]>();

// Four optional fields produce at most 16 exact/wildcard subscription keys.
const matchingScopeAudienceKeys = (scope: Scope): string[] => {
  const cached = scopeAudienceKeys.get(scope);

  if (cached) return cached;
  let keys: Array<Array<string | number | undefined>> = [[scope.topic]];

  for (const value of [
    scope.organizationId,
    scope.eventId,
    scope.world,
    scope.mapId,
  ]) {
    keys = keys.flatMap((key) =>
      value === undefined
        ? [[...key, undefined]]
        : [
            [...key, undefined],
            [...key, value],
          ],
    );
  }

  const audienceKeys = keys.map((key) => JSON.stringify(key));
  scopeAudienceKeys.set(scope, audienceKeys);

  return audienceKeys;
};

/**
 * Indexes this replica's sockets by identity, subscription scope, and
 * recipient location, so a delivery visits only its possible recipients.
 */
export class RealtimeAudiences {
  private readonly audiences = new Map<string, Set<GatewaySocket>>();
  private readonly locationKeys = new WeakMap<GatewaySocket, string>();

  /** Adds or removes the identity and subscription audiences of a session. */
  addSession(socket: GatewaySocket): void {
    for (const key of this.sessionKeys(socket.data)) this.add(key, socket);
  }

  removeSession(socket: GatewaySocket): void {
    for (const key of this.sessionKeys(socket.data)) this.remove(key, socket);
    this.removeLocation(socket);
  }

  addScope(scope: Scope, socket: GatewaySocket): void {
    this.add(getScopeKey(scope), socket);
  }

  removeScope(scope: Scope, socket: GatewaySocket): void {
    this.remove(getScopeKey(scope), socket);
  }

  /** Moves `socket` to the audience of its location; `undefined` leaves every location. */
  setLocation(
    socket: GatewaySocket,
    location: { readonly world: string; readonly mapId: number } | undefined,
  ): void {
    const nextKey =
      location === undefined
        ? undefined
        : getLocationAudienceKey(
            socket.data.platform,
            location.world,
            location.mapId,
          );

    if (this.locationKeys.get(socket) === nextKey) return;
    this.removeLocation(socket);

    if (nextKey !== undefined) {
      this.add(nextKey, socket);
      this.locationKeys.set(socket, nextKey);
    }
  }

  /** The audiences whose subscriptions match a delivered `scope`. */
  scopeAudiences(scope: Scope): Set<GatewaySocket>[] {
    return matchingScopeAudienceKeys(scope).flatMap((key) => {
      const audience = this.audiences.get(key);

      return audience ? [audience] : [];
    });
  }

  socketsForUser(userId: string): ReadonlyArray<GatewaySocket> {
    return [
      ...(this.audiences.get(getIdentityAudienceKey("user", userId)) ?? []),
    ];
  }

  /** Distinct scopes of `topic` that a local socket subscribes to. */
  localScopes(topic: Scope["topic"]): Scope[] {
    const prefix = JSON.stringify([topic]).slice(0, -1);
    const scopes: Scope[] = [];

    for (const key of this.audiences.keys()) {
      if (!key.startsWith(`${prefix},`)) continue;

      // SAFETY: keys with this topic prefix come only from getScopeKey.
      const [, organizationId, eventId, world, mapId] = JSON.parse(key) as [
        string,
        string | null,
        string | null,
        string | null,
        number | null,
      ];

      scopes.push({
        topic,
        ...(organizationId !== null && { organizationId }),
        ...(eventId !== null && { eventId }),
        ...(world !== null && { world }),
        ...(mapId !== null && { mapId }),
      });
    }

    return scopes;
  }

  /** The sockets that may receive `message`, before visibility checks. */
  candidates(message: FederatedRealtimeMessage): ReadonlySet<GatewaySocket> {
    const keys: string[] = [];

    if (message.userId !== undefined)
      keys.push(getIdentityAudienceKey("user", message.userId));

    if (message.discordId !== undefined)
      keys.push(getIdentityAudienceKey("discord", message.discordId));
    const scopes = message.scope ? [message.scope] : [];

    if (message.scopes) scopes.push(...message.scopes);

    for (const scope of scopes) {
      keys.push(...matchingScopeAudienceKeys(scope));
    }

    const audiences = keys.flatMap((key) => {
      const audience = this.audiences.get(key);

      return audience ? [audience] : [];
    });

    if (
      message.recipientPlatform !== undefined &&
      message.recipientWorld !== undefined &&
      message.recipientMapId !== undefined
    ) {
      const location = this.audiences.get(
        getLocationAudienceKey(
          message.recipientPlatform,
          message.recipientWorld,
          message.recipientMapId,
        ),
      );

      const candidates = new Set<GatewaySocket>();

      if (!location) return candidates;

      const audienceSize = audiences.reduce(
        (size, audience) => size + audience.size,
        0,
      );

      if (location.size < audienceSize) {
        for (const socket of location) {
          if (audiences.some((audience) => audience.has(socket)))
            candidates.add(socket);
        }
      } else {
        for (const audience of audiences) {
          for (const socket of audience) {
            if (location.has(socket)) candidates.add(socket);
          }
        }
      }

      return candidates;
    }

    const [first, ...others] = audiences;

    if (!first) return new Set();

    if (others.length === 0) return first;
    const candidates = new Set(first);

    for (const audience of others) {
      for (const socket of audience) candidates.add(socket);
    }

    return candidates;
  }

  private sessionKeys(session: SessionData): string[] {
    return [
      getIdentityAudienceKey("user", session.userId),
      getIdentityAudienceKey("discord", session.discordId),
      ...Array.from(session.subscriptions.values(), getScopeKey),
    ];
  }

  private add(key: string, socket: GatewaySocket): void {
    let audience = this.audiences.get(key);

    if (!audience) {
      audience = new Set();
      this.audiences.set(key, audience);
    }

    audience.add(socket);
  }

  private remove(key: string, socket: GatewaySocket): void {
    const audience = this.audiences.get(key);

    if (!audience) return;
    audience.delete(socket);

    if (audience.size === 0) this.audiences.delete(key);
  }

  private removeLocation(socket: GatewaySocket): void {
    const key = this.locationKeys.get(socket);

    if (key === undefined) return;
    this.remove(key, socket);
    this.locationKeys.delete(socket);
  }
}
