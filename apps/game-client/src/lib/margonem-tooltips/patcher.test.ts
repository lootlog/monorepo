import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  installCharacterTooltipTransforms,
  patchOtherCharacterTooltip,
  patchOtherCharacterTooltips,
  refreshActiveOtherCanvasTooltip,
  refreshCharacterTooltips,
} from "./patcher";
import { characterTooltipTransforms } from "./registry";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { runtimeOtherHandles } from "@/lib/margonem-runtime/runtime-other-handles";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useOthersStore } from "@/store/others.store";
import { testRuntimeWindow } from "@/test/test-runtime-window";
import type { Other } from "@lootlog/margonem/others";

type TestCharacter = {
  canvasObjectType?: string;
  d: { account?: number; id?: string; nick: string };
  createStrTip?: () => string;
  tip?: [string, string];
  tipUpdate?: () => void;
  updateTip?: () => void;
};

const originalWindowEngine = testRuntimeWindow.Engine;

function createCharacter(nick: string): TestCharacter {
  const character: TestCharacter = {
    d: { nick },
    createStrTip: () => `<div>${nick}</div>`,
  };

  character.updateTip = vi.fn(() => {
    character.tip = [String(character.createStrTip?.() ?? ""), "t_other"];
  });
  character.tipUpdate = vi.fn(() => {
    character.tip = [String(character.createStrTip?.() ?? ""), "t_other"];
  });

  return character;
}

function setRuntime(
  hero: TestCharacter,
  others: Record<string, TestCharacter>,
  canvasTip?: {
    hide: ReturnType<typeof vi.fn>;
    show: ReturnType<typeof vi.fn>;
  },
) {
  Object.defineProperty(window, "Engine", {
    configurable: true,
    value: {
      canvasTip,
      hero,
      others,
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

function setOnlineOwner(character: TestCharacter): void {
  useOnlineCharacterOwnersStore.getState().setPresenceResponse({
    "player-discord": [
      {
        discordId: "player-discord",
        isAfk: false,
        player: {
          accountId: String(character.d.account),
          characterId: String(character.d.id),
          icon: "",
          lvl: 300,
          name: character.d.nick,
          prof: "w",
          world: "tempest",
        },
      },
    ],
  });
}

describe("installCharacterTooltipTransforms", () => {
  beforeEach(() => {
    characterTooltipTransforms.clear();
    useCharacterTooltipCatchingGuildsStore.getState().clear();
    useOnlineCharacterOwnersStore.getState().clearOwners();
    useOthersStore.getState().clearOthers();
    runtimeOtherHandles.clear();
  });

  afterEach(() => {
    characterTooltipTransforms.clear();
    useCharacterTooltipCatchingGuildsStore.getState().clear();
    useOnlineCharacterOwnersStore.getState().clearOwners();
    useOthersStore.getState().clearOthers();
    runtimeOtherHandles.clear();

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
    expect(hero.createStrTip?.()).toBe("<div>Hero</div><span>one</span>");

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
    expect(hero.createStrTip?.()).toBe("<div>replacement</div>");
    expect(other.createStrTip?.()).toBe("<div>replacement</div>");

    cleanup();

    expect(hero.createStrTip).toBe(originalHeroCreateStrTip);
    expect(other.createStrTip).toBe(originalOtherCreateStrTip);
    expect(hero.createStrTip?.()).toBe("<div>Hero</div>");
    expect(other.createStrTip?.()).toBe("<div>Other</div>");
  });

  it("restores an own tooltip method when an other leaves the current map", () => {
    const hero = createCharacter("Hero");
    const other = createCharacter("Other");
    const originalOtherCreateStrTip = other.createStrTip;
    setRuntime(hero, { 1: other });
    useOthersStore.getState().setMany(asOtherRecord({ 1: other }));
    characterTooltipTransforms.register(() => "<div>replacement</div>");
    const cleanup = installCharacterTooltipTransforms();

    try {
      expect(other.createStrTip?.()).toBe("<div>replacement</div>");

      runtimeOtherHandles.applyBatch({ removeIds: ["1"] });
      useOthersStore.getState().applyBatch({ removeIds: ["1"] });

      expect(other.createStrTip).toBe(originalOtherCreateStrTip);
      expect(other.createStrTip?.()).toBe("<div>Other</div>");
    } finally {
      cleanup();
    }
  });

  it("keeps a live runtime tooltip patched when normalized other state updates", () => {
    const hero = createCharacter("Hero");
    const other = createCharacter("Other");
    other.d.id = "1";
    other.d.account = 2;
    setRuntime(hero, { 1: other });
    useOthersStore.getState().setMany(asOtherRecord({ 1: other }));
    characterTooltipTransforms.register(() => "<div>replacement</div>");
    const cleanup = installCharacterTooltipTransforms();

    try {
      useOthersStore.getState().applyBatch({
        upserts: {
          1: {
            accountId: "2",
            characterId: "1",
            icon: "other.gif",
            level: 300,
            name: "Other",
            profession: "w",
          },
        },
      });

      expect(other.createStrTip?.()).toBe("<div>replacement</div>");
    } finally {
      cleanup();
    }
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

  it("retries hero patching when createStrTip appears after install", () => {
    const hero = {
      d: { nick: "Hero" },
    } as TestCharacter;
    const other = createCharacter("Other");
    setRuntime(hero, { 1: other });

    characterTooltipTransforms.register(({ currentHtml }) => {
      return `${currentHtml}<span>late</span>`;
    });

    const cleanup = installCharacterTooltipTransforms();

    hero.createStrTip = () => "<div>Hero</div>";
    hero.updateTip = vi.fn(() => {
      hero.tip = [String(hero.createStrTip?.() ?? ""), "t_hero"];
    });

    refreshCharacterTooltips();

    expect(hero.tip?.[0]).toBe("<div>Hero</div><span>late</span>");

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

  it("tracks active other from canvas tip show instead of createStrTip refreshes", () => {
    const hero = createCharacter("Hero");
    const first = createCharacter("First");
    const second = createCharacter("Second");
    const canvasTip = {
      hide: vi.fn(),
      show: vi.fn(),
    };
    first.canvasObjectType = "OTHER";
    first.d = { account: 9822301, id: "617", nick: "First" };
    second.canvasObjectType = "OTHER";
    second.d = { account: 9822301, id: "30016", nick: "Second" };
    setRuntime(hero, { 1: first, 2: second }, canvasTip);
    useOthersStore.getState().setMany(asOtherRecord({ 1: first, 2: second }));
    setOnlineOwner(first);

    const cleanup = installCharacterTooltipTransforms();
    const runtimeCanvasTip = (
      testRuntimeWindow.Engine as unknown as {
        canvasTip: {
          hide: (event: unknown) => unknown;
          show: (event: unknown, object: unknown) => unknown;
        };
      }
    ).canvasTip;

    second.tipUpdate?.();
    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeTarget,
    ).toBeNull();

    runtimeCanvasTip.show({}, first);
    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeTarget?.key,
    ).toBe("9822301:617");

    second.tipUpdate?.();
    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeTarget?.key,
    ).toBe("9822301:617");

    runtimeCanvasTip.hide({});
    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeTarget,
    ).toBeNull();

    cleanup();
  });

  it("clears active other state during canvas tip cleanup", () => {
    const hero = createCharacter("Hero");
    const other = createCharacter("Other");
    const canvasTip = {
      hide: vi.fn(),
      show: vi.fn(),
    };
    other.canvasObjectType = "OTHER";
    other.d = { account: 9822301, id: "617", nick: "Other" };
    setRuntime(hero, { 1: other }, canvasTip);
    useOthersStore.getState().setMany(asOtherRecord({ 1: other }));
    setOnlineOwner(other);

    const cleanup = installCharacterTooltipTransforms();
    const runtimeCanvasTip = (
      testRuntimeWindow.Engine as unknown as {
        canvasTip: {
          show: (event: unknown, object: unknown) => unknown;
        };
      }
    ).canvasTip;

    runtimeCanvasTip.show({}, other);
    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeTarget?.key,
    ).toBe("9822301:617");

    cleanup();

    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeTarget,
    ).toBeNull();
  });

  it("refreshes the currently visible other canvas tooltip", () => {
    const hero = createCharacter("Hero");
    const other = createCharacter("Other");
    const canvasTip = {
      hide: vi.fn(),
      show: vi.fn(),
    };
    const originalCanvasTipShow = canvasTip.show;
    other.canvasObjectType = "OTHER";
    other.d = { account: 9822301, id: "617", nick: "Other" };
    setRuntime(hero, { 1: other }, canvasTip);
    useOthersStore.getState().setMany(asOtherRecord({ 1: other }));

    const cleanup = installCharacterTooltipTransforms();
    const runtimeCanvasTip = (
      testRuntimeWindow.Engine as unknown as {
        canvasTip: {
          hide: (event: unknown) => unknown;
          show: (event: unknown, object: unknown) => unknown;
        };
      }
    ).canvasTip;
    const hoverEvent = { clientX: 10, clientY: 20 };

    runtimeCanvasTip.show(hoverEvent, other);
    originalCanvasTipShow.mockClear();

    refreshActiveOtherCanvasTooltip();

    expect(other.tip?.[0]).toBe("<div>Other</div>");
    expect(originalCanvasTipShow).toHaveBeenCalledWith(hoverEvent, other);

    cleanup();
  });

  it("refreshes a hovered other tooltip when shift is already pressed", () => {
    const hero = createCharacter("Hero");
    const other = createCharacter("Other");
    const canvasTip = {
      hide: vi.fn(),
      show: vi.fn(),
    };
    const originalCanvasTipShow = canvasTip.show;
    other.canvasObjectType = "OTHER";
    other.d = { account: 9822301, id: "617", nick: "Other" };
    setRuntime(hero, { 1: other }, canvasTip);
    useOthersStore.getState().setMany(asOtherRecord({ 1: other }));

    characterTooltipTransforms.register(({ currentHtml }) => {
      if (!useCharacterTooltipCatchingGuildsStore.getState().isShiftPressed) {
        return currentHtml;
      }

      return `${currentHtml}<span>shift</span>`;
    });

    const cleanup = installCharacterTooltipTransforms();
    const runtimeCanvasTip = (
      testRuntimeWindow.Engine as unknown as {
        canvasTip: {
          hide: (event: unknown) => unknown;
          show: (event: unknown, object: unknown) => unknown;
        };
      }
    ).canvasTip;
    const hoverEvent = { clientX: 10, clientY: 20 };

    expect(other.tip?.[0]).toBe("<div>Other</div>");

    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    runtimeCanvasTip.show(hoverEvent, other);

    expect(other.tip?.[0]).toBe("<div>Other</div><span>shift</span>");
    expect(originalCanvasTipShow).toHaveBeenCalledWith(hoverEvent, other);

    cleanup();
  });
});
