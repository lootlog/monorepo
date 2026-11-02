import { afterEach, describe, expect, it } from "vitest";
import type { Other } from "@lootlog/margonem/others";
import { characterTooltipTransforms } from "./registry";

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

const apply = () =>
  characterTooltipTransforms.apply({
    character: OTHER,
    interface: "ni",
    baseHtml: "<div>base</div>",
    currentHtml: "<div>base</div>",
  });

describe("characterTooltipTransforms", () => {
  afterEach(() => {
    characterTooltipTransforms.clear();
  });

  it("keeps the current html when the transform returns nothing", () => {
    characterTooltipTransforms.register(() => undefined);
    expect(apply()).toBe("<div>base</div>");

    characterTooltipTransforms.register(() => null);
    expect(apply()).toBe("<div>base</div>");
  });

  it("allows the transform to clear the tooltip", () => {
    characterTooltipTransforms.register(() => "");

    expect(apply()).toBe("");
  });

  it("keeps a newer transform when an older registration is cleaned up", () => {
    const cleanupOlder = characterTooltipTransforms.register(() => "older");
    characterTooltipTransforms.register(() => "newer");

    cleanupOlder();

    expect(apply()).toBe("newer");
  });
});
