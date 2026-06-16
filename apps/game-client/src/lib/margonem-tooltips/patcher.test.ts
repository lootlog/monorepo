import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  characterTooltipTransforms,
  installCharacterTooltipTransforms,
  patchOtherCharacterTooltip,
  patchOtherCharacterTooltips,
} from "./index";
import { useOthersStore } from "@/store/others.store";
import type { Other } from "@lootlog/margonem";

type TestCharacter = {
  d: { nick: string };
  createStrTip: () => string;
  tip?: [string, string];
  tipUpdate?: ReturnType<typeof vi.fn>;
  updateTip?: ReturnType<typeof vi.fn>;
};

const originalWindowEngine = window.Engine;

function createCharacter(nick: string): TestCharacter {
  const character: TestCharacter = {
    d: { nick },
    createStrTip: () => `<div>${nick}</div>`,
  };

  character.updateTip = vi.fn(() => {
    character.tip = [character.createStrTip(), "t_other"];
  });
  character.tipUpdate = vi.fn(() => {
    character.tip = [character.createStrTip(), "t_other"];
  });

  return character;
}

function setRuntime(
  hero: TestCharacter,
  others: Record<string, TestCharacter>,
) {
  Object.defineProperty(window, "Engine", {
    configurable: true,
    value: {
      hero,
      others: {
        check: () => others,
      },
    },
  });
}

function asOther(character: TestCharacter): Other {
  return character as unknown as Other;
}

function asOtherRecord(
  others: Record<string, TestCharacter>,
): Record<string, Other> {
  return others as unknown as Record<string, Other>;
}

describe("installCharacterTooltipTransforms", () => {
  beforeEach(() => {
    characterTooltipTransforms.clear();
    useOthersStore.getState().clearOthers();
  });

  afterEach(() => {
    characterTooltipTransforms.clear();
    useOthersStore.getState().clearOthers();

    Object.defineProperty(window, "Engine", {
      configurable: true,
      value: originalWindowEngine,
    });
  });

  it("patches hero and existing others, then refreshes their tips", () => {
    const hero = createCharacter("Hero");
    const other = createCharacter("Other");
    setRuntime(hero, { 1: other });
    useOthersStore.getState().setMany(asOtherRecord({ 1: other }));

    characterTooltipTransforms.register(({ currentHtml }) => {
      return `${currentHtml}<div class="ll-tooltip-extra">extra</div>`;
    });

    const cleanup = installCharacterTooltipTransforms();

    expect(hero.tip?.[0]).toBe(
      '<div>Hero</div><div class="ll-tooltip-extra">extra</div>',
    );
    expect(other.tip?.[0]).toBe(
      '<div>Other</div><div class="ll-tooltip-extra">extra</div>',
    );
    expect(hero.updateTip).toHaveBeenCalledOnce();
    expect(other.tipUpdate).toHaveBeenCalledOnce();

    cleanup();
  });

  it("does not patch twice", () => {
    const hero = createCharacter("Hero");
    const other = createCharacter("Other");
    setRuntime(hero, { 1: other });
    useOthersStore.getState().setMany(asOtherRecord({ 1: other }));

    characterTooltipTransforms.register(({ currentHtml }) => {
      return `${currentHtml}<span>one</span>`;
    });

    const cleanupA = installCharacterTooltipTransforms();
    const cleanupB = installCharacterTooltipTransforms();

    expect(cleanupA).toBe(cleanupB);
    expect(hero.createStrTip()).toBe("<div>Hero</div><span>one</span>");

    cleanupA();
  });

  it("restores original methods on cleanup", () => {
    const hero = createCharacter("Hero");
    const other = createCharacter("Other");
    const originalHeroCreateStrTip = hero.createStrTip;
    const originalOtherCreateStrTip = other.createStrTip;
    setRuntime(hero, { 1: other });
    useOthersStore.getState().setMany(asOtherRecord({ 1: other }));

    characterTooltipTransforms.register(() => "<div>replacement</div>");

    const cleanup = installCharacterTooltipTransforms();
    expect(hero.createStrTip()).toBe("<div>replacement</div>");
    expect(other.createStrTip()).toBe("<div>replacement</div>");

    cleanup();

    expect(hero.createStrTip).toBe(originalHeroCreateStrTip);
    expect(other.createStrTip).toBe(originalOtherCreateStrTip);
    expect(hero.createStrTip()).toBe("<div>Hero</div>");
    expect(other.createStrTip()).toBe("<div>Other</div>");
  });

  it("patches a single new other character", () => {
    const hero = createCharacter("Hero");
    const other = createCharacter("Other");
    const others: Record<string, TestCharacter> = {};
    setRuntime(hero, others);

    characterTooltipTransforms.register(({ currentHtml }) => {
      return `${currentHtml}<span>new</span>`;
    });

    const cleanup = installCharacterTooltipTransforms();

    others[1] = other;
    patchOtherCharacterTooltip(asOther(other));

    expect(other.tip?.[0]).toBe("<div>Other</div><span>new</span>");
    expect(other.tipUpdate).toHaveBeenCalledOnce();

    cleanup();
  });

  it("batch patches only provided other characters", () => {
    const hero = createCharacter("Hero");
    const first = createCharacter("First");
    const second = createCharacter("Second");
    const skipped = createCharacter("Skipped");
    setRuntime(hero, { 1: first, 2: second, 3: skipped });

    characterTooltipTransforms.register(({ currentHtml }) => {
      return `${currentHtml}<span>batch</span>`;
    });

    const cleanup = installCharacterTooltipTransforms();

    patchOtherCharacterTooltips([asOther(first), asOther(second)]);

    expect(first.tip?.[0]).toBe("<div>First</div><span>batch</span>");
    expect(second.tip?.[0]).toBe("<div>Second</div><span>batch</span>");
    expect(skipped.tip).toBeUndefined();

    cleanup();
  });

  it("does not double-transform prototype-based other tooltips", () => {
    const hero = createCharacter("Hero");
    class PrototypeOther {
      d = { nick: "Other" };
      tip?: [string, string];
      tipUpdate = vi.fn(() => {
        this.tip = [this.createStrTip(), "t_other"];
      });

      createStrTip() {
        return "<div>Other</div>";
      }
    }
    const other = new PrototypeOther();
    setRuntime(hero, { 1: other });
    useOthersStore
      .getState()
      .setMany(asOtherRecord({ 1: other as unknown as TestCharacter }));

    characterTooltipTransforms.register(({ currentHtml }) => {
      return `${currentHtml}<span>once</span>`;
    });

    const cleanup = installCharacterTooltipTransforms();

    expect(other.createStrTip()).toBe("<div>Other</div><span>once</span>");
    expect(other.tip?.[0]).toBe("<div>Other</div><span>once</span>");

    cleanup();
  });
});
