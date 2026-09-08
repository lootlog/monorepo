import { describe, expect, it } from "vitest";
import { parseRuntimeFacts } from "./runtime-event-parser";

describe("parseRuntimeFacts", () => {
  it("does not emit an afk fact for hero patches without stasis", () => {
    const facts = parseRuntimeFacts({ h: { x: 10, y: 20 } });

    expect(facts.map((fact) => fact.kind)).not.toContain("afk");
  });

  it("emits an afk fact when the stasis field is present", () => {
    const facts = parseRuntimeFacts({ h: { stasis: 0 } });

    expect(facts.map((fact) => fact.kind)).toContain("afk");
  });
});
