import { describe, expect, it, vi } from "vitest";
import type { Other } from "@lootlog/margonem/others";
import { CharacterTooltipTransformRegistry } from "./registry";

const OTHER: Other = {
  d: {
    account: 1,
    icon: "other.gif",
    id: "1",
    lvl: 300,
    nick: "Other",
    prof: "w",
  },
};

describe("CharacterTooltipTransformRegistry", () => {
  it("runs transforms in registration order", () => {
    const registry = new CharacterTooltipTransformRegistry();

    registry.register(({ currentHtml }) => `${currentHtml}<span>A</span>`);
    registry.register(({ currentHtml }) => `${currentHtml}<span>B</span>`);

    expect(
      registry.apply({
        character: OTHER,
        baseHtml: "<div>base</div>",
        currentHtml: "<div>base</div>",
      }),
    ).toBe("<div>base</div><span>A</span><span>B</span>");
  });

  it("allows a transform to replace the whole tooltip", () => {
    const registry = new CharacterTooltipTransformRegistry();

    registry.register(() => "<section>replacement</section>");

    expect(
      registry.apply({
        character: OTHER,
        baseHtml: "<div>base</div>",
        currentHtml: "<div>base</div>",
      }),
    ).toBe("<section>replacement</section>");
  });

  it("keeps the current html when a transform returns nothing", () => {
    const registry = new CharacterTooltipTransformRegistry();

    registry.register(() => undefined);
    registry.register(() => null);

    expect(
      registry.apply({
        character: OTHER,
        baseHtml: "<div>base</div>",
        currentHtml: "<div>base</div>",
      }),
    ).toBe("<div>base</div>");
  });

  it("allows a transform to clear the tooltip", () => {
    const registry = new CharacterTooltipTransformRegistry();
    registry.register(() => "");
    expect(
      registry.apply({
        character: OTHER,
        baseHtml: "base",
        currentHtml: "base",
      }),
    ).toBe("");
  });

  it("continues after a failing transform", () => {
    const registry = new CharacterTooltipTransformRegistry();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    registry.register(() => {
      throw new Error("broken");
    });
    registry.register(({ currentHtml }) => `${currentHtml}<span>ok</span>`);

    expect(
      registry.apply({
        character: OTHER,
        baseHtml: "<div>base</div>",
        currentHtml: "<div>base</div>",
      }),
    ).toBe("<div>base</div><span>ok</span>");
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });
});
