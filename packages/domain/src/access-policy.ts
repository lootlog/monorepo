import {
  Capability as CapabilityValues,
  type Capability as CapabilityName,
} from "@lootlog/schema/permissions";

export const Capability = CapabilityValues;

export type Capability = CapabilityName;

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

export function capabilitiesGrantingAny(
  required: readonly Capability[],
): Capability[] {
  const granting = new Set(required);

  granting.add(Capability.OWNER);

  if (required.some((capability) => capability !== Capability.OWNER)) {
    granting.add(Capability.ADMIN);
  }

  return [...granting];
}

export const AccessRequirement = {
  ADMINISTER: [Capability.ADMIN],
  MODERATE: [Capability.ADMIN, Capability.LOOTLOG_MANAGE],
} as const satisfies Record<string, readonly Capability[]>;

export function memberCapabilities(member: {
  readonly ownerId: string;
  readonly viewerId: string;
  readonly roles: readonly { readonly permissions: readonly Capability[] }[];
}): Capability[] {
  return member.ownerId === member.viewerId
    ? [Capability.OWNER]
    : member.roles.flatMap((role) => role.permissions);
}
