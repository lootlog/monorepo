import { describe, expect, it } from "bun:test";
import { pickGuildByIdOrVanityUrl } from "./active-guild-lookup.js";

describe("pickGuildByIdOrVanityUrl", () => {
  const victim = { id: "123456789012345678", vanityUrl: null };
  const hijacker = { id: "987654321098765432", vanityUrl: victim.id };
  const named = { id: "555555555555555555", vanityUrl: "nazwa-klanu" };

  it("resolves an id to its owner even when another Organization's vanity URL equals it and sorts first", () => {
    expect(pickGuildByIdOrVanityUrl([hijacker, victim], victim.id)).toBe(
      victim,
    );
  });

  it("never resolves an id-like value through a vanity URL", () => {
    expect(
      pickGuildByIdOrVanityUrl([hijacker, named], victim.id),
    ).toBeUndefined();
  });

  it("resolves a vanity URL when no id matches", () => {
    expect(pickGuildByIdOrVanityUrl([hijacker, named], "nazwa-klanu")).toBe(
      named,
    );
  });
});
