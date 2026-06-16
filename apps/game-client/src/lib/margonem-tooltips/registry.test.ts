import { describe, expect, it, vi } from "vitest";
import { CharacterTooltipTransformRegistry } from "./registry";

describe("CharacterTooltipTransformRegistry", () => {
  it("runs transforms in registration order", () => {
    const registry = new CharacterTooltipTransformRegistry();

    registry.register(({ currentHtml }) => `${currentHtml}<span>A</span>`);
    registry.register(({ currentHtml }) => `${currentHtml}<span>B</span>`);

    expect(
      registry.apply({
        kind: "hero",
        character: {},
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
        kind: "other",
        character: {},
        baseHtml: "<div>base</div>",
        currentHtml: "<div>base</div>",
      }),
    ).toBe("<section>replacement</section>");
  });

  it("keeps the current html when a transform returns nothing", () => {
    const registry = new CharacterTooltipTransformRegistry();

    registry.register(() => undefined);

    expect(
      registry.apply({
        kind: "hero",
        character: {},
        baseHtml: "<div>base</div>",
        currentHtml: "<div>base</div>",
      }),
    ).toBe("<div>base</div>");
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
        kind: "hero",
        character: {},
        baseHtml: "<div>base</div>",
        currentHtml: "<div>base</div>",
      }),
    ).toBe("<div>base</div><span>ok</span>");
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });
});
