export const Capability = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  LOOTLOG_MANAGE: "LOOTLOG_MANAGE",
  LOOTLOG_ACCESS: "LOOTLOG_ACCESS",
  LOOTLOG_LOOTS_READ: "LOOTLOG_LOOTS_READ",
  LOOTLOG_LOOTS_WRITE: "LOOTLOG_LOOTS_WRITE",
  LOOTLOG_LOOTS_ARCHIVE: "LOOTLOG_LOOTS_ARCHIVE",
  LOOTLOG_LOOTS_TITANS_READ: "LOOTLOG_LOOTS_TITANS_READ",
  LOOTLOG_LOOTS_HEROES_READ: "LOOTLOG_LOOTS_HEROES_READ",
  LOOTLOG_TIMERS_READ: "LOOTLOG_TIMERS_READ",
  LOOTLOG_TIMERS_WRITE: "LOOTLOG_TIMERS_WRITE",
  LOOTLOG_TIMERS_RESET: "LOOTLOG_TIMERS_RESET",
  LOOTLOG_TIMERS_DELETE: "LOOTLOG_TIMERS_DELETE",
  LOOTLOG_TIMERS_TITANS_READ: "LOOTLOG_TIMERS_TITANS_READ",
  LOOTLOG_TIMERS_HEROES_READ: "LOOTLOG_TIMERS_HEROES_READ",
  LOOTLOG_RESERVATIONS_READ: "LOOTLOG_RESERVATIONS_READ",
  LOOTLOG_RESERVATIONS_WRITE: "LOOTLOG_RESERVATIONS_WRITE",
  LOOTLOG_MEMBERS_READ: "LOOTLOG_MEMBERS_READ",
  LOOTLOG_ONLINE_PLAYERS_READ: "LOOTLOG_ONLINE_PLAYERS_READ",
  LOOTLOG_CHAT_READ: "LOOTLOG_CHAT_READ",
  LOOTLOG_CHAT_WRITE: "LOOTLOG_CHAT_WRITE",
  LOOTLOG_CHAT_TITANS_READ: "LOOTLOG_CHAT_TITANS_READ",
  LOOTLOG_CHAT_HEROES_READ: "LOOTLOG_CHAT_HEROES_READ",
  LOOTLOG_NOTIFICATIONS_READ: "LOOTLOG_NOTIFICATIONS_READ",
  LOOTLOG_NOTIFICATIONS_SEND: "LOOTLOG_NOTIFICATIONS_SEND",
  LOOTLOG_NOTIFICATIONS_TITANS_READ: "LOOTLOG_NOTIFICATIONS_TITANS_READ",
  LOOTLOG_NOTIFICATIONS_HEROES_READ: "LOOTLOG_NOTIFICATIONS_HEROES_READ",
  LOOTLOG_EVENTS_MANAGE: "LOOTLOG_EVENTS_MANAGE",
  LOOTLOG_EVENTS_READ: "LOOTLOG_EVENTS_READ",
  LOOTLOG_EVENTS_WRITE: "LOOTLOG_EVENTS_WRITE",
  LOOTLOG_DOCS_READ: "LOOTLOG_DOCS_READ",
  LOOTLOG_DOCS_WRITE: "LOOTLOG_DOCS_WRITE",
} as const;

export type Capability = (typeof Capability)[keyof typeof Capability];

export type AccessPolicySnapshot = {
  capabilities: readonly Capability[];
};

export interface AccessPolicy {
  allows(capability: Capability): boolean;
  allowsAny(capabilities: readonly Capability[]): boolean;
}

const ALL_CAPABILITIES = Object.values(Capability);
const EFFECTIVE_CAPABILITIES = new WeakMap<
  AccessPolicy,
  readonly Capability[]
>();

export function createAccessPolicy(
  snapshot: AccessPolicySnapshot,
): AccessPolicy {
  const capabilities = new Set(resolveCapabilities(snapshot));

  const accessPolicy = Object.freeze({
    allows: (capability: Capability) => capabilities.has(capability),
    allowsAny: (requiredCapabilities: readonly Capability[]) =>
      requiredCapabilities.some((capability) => capabilities.has(capability)),
  });

  EFFECTIVE_CAPABILITIES.set(accessPolicy, [...capabilities]);
  return accessPolicy;
}

/**
 * Serializes a policy at a storage or transport adapter. Decision callers
 * should use `allows` or `allowsAny` instead.
 */
export function getEffectiveCapabilities(
  accessPolicy: AccessPolicy,
): Capability[] {
  const capabilities = EFFECTIVE_CAPABILITIES.get(accessPolicy);
  if (!capabilities) {
    throw new TypeError(
      "Only policies created by createAccessPolicy can be serialized",
    );
  }

  return [...capabilities];
}

export function resolveCapabilities(
  snapshot: AccessPolicySnapshot,
): Capability[] {
  const explicitCapabilities = new Set(snapshot.capabilities);

  if (explicitCapabilities.has(Capability.OWNER)) {
    return [...ALL_CAPABILITIES];
  }

  if (explicitCapabilities.has(Capability.ADMIN)) {
    return ALL_CAPABILITIES.filter(
      (capability) => capability !== Capability.OWNER,
    );
  }

  return [...explicitCapabilities];
}
