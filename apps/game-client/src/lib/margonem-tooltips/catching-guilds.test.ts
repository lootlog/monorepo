import { beforeEach, describe, expect, it } from "vitest";
import type { Other } from "@lootlog/margonem/others";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { appendCatchingGuildsTooltipSection } from "./catching-guilds";

const createOther = (): Other =>
  ({
    d: {
      account: 9822301,
      icon: "other.gif",
      id: "617",
      lvl: 300,
      nick: "Other",
      prof: "w",
    },
  }) as Other;

describe("appendCatchingGuildsTooltipSection", () => {
  beforeEach(() => {
    useCharacterTooltipCatchingGuildsStore.getState().clear();
  });

  it("does not extend non-other tooltips", () => {
    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);

    expect(
      appendCatchingGuildsTooltipSection({
        baseHtml: "<div>Hero</div>",
        character: {},
        currentHtml: "<div>Hero</div>",
        kind: "hero",
      }),
    ).toBe("<div>Hero</div>");
  });

  it("does not extend other tooltips while shift is not pressed", () => {
    expect(
      appendCatchingGuildsTooltipSection({
        baseHtml: "<div>Other</div>",
        character: createOther(),
        currentHtml: "<div>Other</div>",
        kind: "other",
      }),
    ).toBe("<div>Other</div>");
  });

  it("shows loading state before guilds are loaded", () => {
    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);

    expect(
      appendCatchingGuildsTooltipSection({
        baseHtml: "<div>Other</div>",
        character: createOther(),
        currentHtml: "<div>Other</div>",
        kind: "other",
      }),
    ).toContain("Ładowanie...");
  });

  it("shows escaped guild names for successful entries", () => {
    const store = useCharacterTooltipCatchingGuildsStore.getState();
    store.setShiftPressed(true);
    store.setSuccess("9822301:617", [
      { id: "guild-1", name: "Alpha <One>" },
      { id: "guild-2", name: "Beta & Co" },
    ]);

    const result = appendCatchingGuildsTooltipSection({
      baseHtml: "<div>Other</div>",
      character: createOther(),
      currentHtml: "<div>Other</div>",
      kind: "other",
    });

    expect(result).toContain("Dodaje łupy i timery na:");
    expect(result).toContain("Alpha &lt;One&gt;");
    expect(result).toContain("Beta &amp; Co");
  });

  it("shows an empty state for successful entries without guilds", () => {
    const store = useCharacterTooltipCatchingGuildsStore.getState();
    store.setShiftPressed(true);
    store.setSuccess("9822301:617", []);

    expect(
      appendCatchingGuildsTooltipSection({
        baseHtml: "<div>Other</div>",
        character: createOther(),
        currentHtml: "<div>Other</div>",
        kind: "other",
      }),
    ).toContain("Brak wspólnych serwerów Lootloga");
  });

  it("shows an empty state while shift is pressed even when the other target is missing", () => {
    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);

    expect(
      appendCatchingGuildsTooltipSection({
        baseHtml: "<div>Other</div>",
        character: { d: {} } as Other,
        currentHtml: "<div>Other</div>",
        kind: "other",
      }),
    ).toContain("Brak wspólnych serwerów Lootloga");
  });

  it("shows an error state", () => {
    const store = useCharacterTooltipCatchingGuildsStore.getState();
    store.setShiftPressed(true);
    store.setError("9822301:617");

    expect(
      appendCatchingGuildsTooltipSection({
        baseHtml: "<div>Other</div>",
        character: createOther(),
        currentHtml: "<div>Other</div>",
        kind: "other",
      }),
    ).toContain("Nie udało się pobrać serwerów");
  });
});
