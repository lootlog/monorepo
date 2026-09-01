import {
  Capability as CapabilityValues,
  type Capability as CapabilityName,
} from "@lootlog/types";

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
