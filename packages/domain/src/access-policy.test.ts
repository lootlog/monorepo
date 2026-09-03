import { describe, expect, it } from "bun:test";
import {
  Capability,
  createAccessPolicy,
  getEffectiveCapabilities,
  resolveCapabilities,
  type AccessPolicy,
} from "./access-policy.js";

describe("AccessPolicy", () => {
  it("allows an explicitly granted capability", () => {
    const policy = createAccessPolicy({
      capabilities: [Capability.LOOTLOG_ACCESS],
    });

    expect(policy.allows(Capability.LOOTLOG_ACCESS)).toBe(true);
    expect(policy.allows(Capability.LOOTLOG_MANAGE)).toBe(false);
  });

  it("treats required capabilities as alternatives", () => {
    const policy = createAccessPolicy({
      capabilities: [Capability.LOOTLOG_EVENTS_READ],
    });

    expect(
      policy.allowsAny([
        Capability.LOOTLOG_EVENTS_WRITE,
        Capability.LOOTLOG_EVENTS_READ,
      ]),
    ).toBe(true);
  });

  it("grants every capability to the recovery authority", () => {
    const policy = createAccessPolicy({
      capabilities: [Capability.OWNER],
    });

    expect(policy.allows(Capability.OWNER)).toBe(true);
    expect(policy.allows(Capability.LOOTLOG_DOCS_WRITE)).toBe(true);
  });

  it("grants every capability except recovery authority to administrators", () => {
    const policy = createAccessPolicy({
      capabilities: [Capability.ADMIN],
    });

    expect(policy.allows(Capability.OWNER)).toBe(false);
    expect(policy.allows(Capability.LOOTLOG_DOCS_WRITE)).toBe(true);
  });

  it("deduplicates capabilities serialized by transport adapters", () => {
    expect(
      resolveCapabilities({
        capabilities: [Capability.LOOTLOG_ACCESS, Capability.LOOTLOG_ACCESS],
      }),
    ).toEqual([Capability.LOOTLOG_ACCESS]);
  });

  it("serializes only at an explicit adapter", () => {
    const policy = createAccessPolicy({
      capabilities: [Capability.ADMIN],
    });

    expect(getEffectiveCapabilities(policy)).not.toContain(Capability.OWNER);
    expect(getEffectiveCapabilities(policy)).toContain(
      Capability.LOOTLOG_DOCS_WRITE,
    );
  });

  it("rejects structurally compatible policies at serialization boundaries", () => {
    const foreignPolicy: AccessPolicy = {
      allows: () => true,
      allowsAny: () => true,
    };

    expect(() => getEffectiveCapabilities(foreignPolicy)).toThrow(TypeError);
  });
});
