import type { RuntimeCanvasTip } from "@/lib/margonem-runtime/adapters/tooltip-runtime-adapter";
import { seedRuntimeOthers } from "@/test/runtime-other-fixtures";
import { createNativeCharacterTips } from "@/test/native-character-tips";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  installCharacterTooltipTransforms,
  refreshActiveOtherTooltip,
} from "./patcher";
import { characterTooltipTransforms } from "./registry";
import { useCharacterTooltipCatchingGuildsStore } from "@/store/character-tooltip-catching-guilds.store";
import { runtimeOtherHandles } from "@/lib/margonem-runtime/runtime-other-handles";
import { useOnlineCharacterOwnersStore } from "@/store/online-character-owners.store";
import { useOthersStore } from "@/store/others.store";
import { testRuntimeWindow } from "@/test/test-runtime-window";
import type { Other } from "@lootlog/margonem/others";

const originalWindowEngine = testRuntimeWindow.Engine;

const originalWindowApi = testRuntimeWindow.API;

let tips: ReturnType<typeof createNativeCharacterTips>;

function createCanvasTip() {
  return {
    hide: vi.fn<NonNullable<RuntimeCanvasTip["hide"]>>(),
    show: vi.fn<NonNullable<RuntimeCanvasTip["show"]>>(),
  };
}

function setRuntime(canvasTip?: RuntimeCanvasTip) {
  Object.defineProperty(window, "API", {
    configurable: true,
    value: tips.api,
  });
  Object.defineProperty(window, "Engine", {
    configurable: true,
    value: {
      apiData: tips.apiData,
      canvasTip,
      others: { createStrTip: tips.createStrTip },
    },
  });
}

function setOnlineOwner(other: Other): void {
  useOnlineCharacterOwnersStore.getState().setPresenceResponse({
    "player-discord": [
      {
        discordId: "player-discord",
        isAfk: false,
        player: {
          accountId: String(other.d.account),
          characterId: String(other.d.id),
          icon: "",
          lvl: 300,
          name: other.d.nick,
          prof: "w",
          world: "tempest",
        },
      },
    ],
  });
}

function registerShiftSection(): void {
  characterTooltipTransforms.register(({ currentHtml }) => {
    if (!useCharacterTooltipCatchingGuildsStore.getState().isShiftPressed) {
      return currentHtml;
    }

    return `${currentHtml}<span>shift</span>`;
  });
}

describe("installCharacterTooltipTransforms", () => {
  beforeEach(() => {
    tips = createNativeCharacterTips();
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
    Object.defineProperty(window, "API", {
      configurable: true,
      value: originalWindowApi,
    });
  });

  it("extends every other tooltip the game builds", () => {
    const other = tips.createOther("Other");
    setRuntime();
    characterTooltipTransforms.register(
      ({ currentHtml }) => `${currentHtml}<span>extra</span>`,
    );

    const cleanup = installCharacterTooltipTransforms();

    other.tipUpdate?.();
    expect(other.tip?.[0]).toBe("<div>Other</div><span>extra</span>");
    // WhoIsHere and the minimap build their own html from the same data.
    expect(tips.createStrTip({ nick: "Other", object: other })).toBe(
      "<div>Other</div><span>extra</span>",
    );

    cleanup();
  });

  it("leaves party member and hero tooltips unchanged", () => {
    setRuntime();
    characterTooltipTransforms.register(() => "<div>replacement</div>");

    const cleanup = installCharacterTooltipTransforms();

    expect(tips.createStrTip({ nick: "Member" })).toBe("<div>Member</div>");
    expect(
      tips.createStrTip({ nick: "Hero", object: { canvasObjectType: "HERO" } }),
    ).toBe("<div>Hero</div>");

    cleanup();
  });

  it("keeps the native tooltip when a transform throws", () => {
    const other = tips.createOther("Other");
    setRuntime();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    characterTooltipTransforms.register(() => {
      throw new Error("broken");
    });

    const cleanup = installCharacterTooltipTransforms();

    expect(() => other.tipUpdate?.()).not.toThrow();
    expect(other.tip?.[0]).toBe("<div>Other</div>");

    cleanup();
  });

  it("subscribes once and unsubscribes on cleanup", () => {
    const other = tips.createOther("Other");
    setRuntime();
    characterTooltipTransforms.register(() => "<div>replacement</div>");

    const cleanupA = installCharacterTooltipTransforms();
    const cleanupB = installCharacterTooltipTransforms();

    expect(cleanupA).toBe(cleanupB);
    expect(tips.handlerCount()).toBe(1);

    cleanupA();

    other.tipUpdate?.();
    expect(tips.handlerCount()).toBe(0);
    expect(other.tip?.[0]).toBe("<div>Other</div>");
  });

  it("removes the Shift section from cached tooltips on cleanup", () => {
    const other = tips.createOther("Other");
    setRuntime();
    seedRuntimeOthers({ 1: other });
    registerShiftSection();

    const cleanup = installCharacterTooltipTransforms();

    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    other.tipUpdate?.();
    expect(other.tip?.[0]).toBe("<div>Other</div><span>shift</span>");

    cleanup();

    expect(other.tip?.[0]).toBe("<div>Other</div>");
  });

  it("tracks a canvas tooltip only while the Shift integration is active", () => {
    const first = tips.createOther("First", "617");
    const second = tips.createOther("Second", "30016");
    const canvasTip = createCanvasTip();

    first.d.account = 9822301;
    second.d.account = 9822301;
    setRuntime(canvasTip);
    seedRuntimeOthers({ 1: first, 2: second });
    setOnlineOwner(first);

    const cleanup = installCharacterTooltipTransforms();

    canvasTip.show({}, first);
    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeTarget,
    ).toBeNull();

    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    canvasTip.show({}, first);
    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeTarget?.key,
    ).toBe("9822301:617");

    // Another player's game update does not move the active target.
    second.tipUpdate?.();
    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeTarget?.key,
    ).toBe("9822301:617");

    canvasTip.hide({});
    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeTarget,
    ).toBeNull();

    cleanup();
  });

  it("clears active other state during canvas tip cleanup", () => {
    const other = tips.createOther("Other", "617");
    const canvasTip = createCanvasTip();

    other.d.account = 9822301;
    setRuntime(canvasTip);
    seedRuntimeOthers({ 1: other });
    setOnlineOwner(other);

    const cleanup = installCharacterTooltipTransforms();

    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    canvasTip.show({}, other);
    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeTarget?.key,
    ).toBe("9822301:617");

    cleanup();

    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeTarget,
    ).toBeNull();
  });

  it("redraws the hovered tooltip with the section when Shift is pressed", () => {
    const other = tips.createOther("Other");
    const canvasTip = createCanvasTip();
    const originalCanvasTipShow = canvasTip.show;
    setRuntime(canvasTip);
    seedRuntimeOthers({ 1: other });
    registerShiftSection();

    const cleanup = installCharacterTooltipTransforms();
    const hoverEvent = { clientX: 10, clientY: 20 };

    other.tipUpdate?.();
    canvasTip.show(hoverEvent, other);
    originalCanvasTipShow.mockClear();

    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    refreshActiveOtherTooltip();

    expect(other.tip?.[0]).toBe("<div>Other</div><span>shift</span>");
    expect(originalCanvasTipShow).toHaveBeenCalledWith(hoverEvent, other);

    cleanup();
  });

  it("rebuilds a tooltip hovered while Shift is already pressed", () => {
    const other = tips.createOther("Other");
    const canvasTip = createCanvasTip();
    const originalCanvasTipShow = canvasTip.show;
    setRuntime(canvasTip);
    seedRuntimeOthers({ 1: other });
    registerShiftSection();

    const cleanup = installCharacterTooltipTransforms();
    const hoverEvent = { clientX: 10, clientY: 20 };

    // The game cached this html before Shift was pressed.
    other.tipUpdate?.();
    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    canvasTip.show(hoverEvent, other);

    expect(other.tip?.[0]).toBe("<div>Other</div><span>shift</span>");
    expect(originalCanvasTipShow).toHaveBeenCalledWith(hoverEvent, other);

    cleanup();
  });

  it("removes the section from the hovered tooltip when Shift is released", () => {
    const other = tips.createOther("Other");
    const canvasTip = createCanvasTip();
    const originalCanvasTipShow = canvasTip.show;
    setRuntime(canvasTip);
    seedRuntimeOthers({ 1: other });
    registerShiftSection();

    const cleanup = installCharacterTooltipTransforms();
    const hoverEvent = { clientX: 10, clientY: 20 };

    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    canvasTip.show(hoverEvent, other);
    expect(other.tip?.[0]).toBe("<div>Other</div><span>shift</span>");

    originalCanvasTipShow.mockClear();
    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(false);
    refreshActiveOtherTooltip();

    expect(other.tip?.[0]).toBe("<div>Other</div>");
    expect(originalCanvasTipShow).toHaveBeenCalledWith(hoverEvent, other);
    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeTarget,
    ).toBeNull();

    cleanup();
  });

  it("removes the section from every present other rebuilt while Shift was held", () => {
    const hovered = tips.createOther("Hovered");
    const idle = tips.createOther("Idle");
    const departed = tips.createOther("Departed");
    setRuntime();
    seedRuntimeOthers({ 1: hovered, 2: idle, 3: departed });
    registerShiftSection();

    const cleanup = installCharacterTooltipTransforms();

    // The game rebuilds tips on its own updates while Shift is held.
    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    hovered.tipUpdate?.();
    idle.tipUpdate?.();
    departed.tipUpdate?.();
    expect(idle.tip?.[0]).toBe("<div>Idle</div><span>shift</span>");

    // A player who leaves the map while Shift is held is no longer drawn.
    seedRuntimeOthers({ 1: hovered, 2: idle });
    const departedTipUpdate = vi.fn<() => void>();

    departed.tipUpdate = departedTipUpdate;

    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(false);
    refreshActiveOtherTooltip();

    expect(hovered.tip?.[0]).toBe("<div>Hovered</div>");
    expect(idle.tip?.[0]).toBe("<div>Idle</div>");
    expect(departedTipUpdate).not.toHaveBeenCalled();

    cleanup();
  });

  it("does not rebuild a hovered tooltip when Shift was never pressed", () => {
    const other = tips.createOther("Other");
    const canvasTip = createCanvasTip();
    const originalCanvasTipShow = canvasTip.show;
    setRuntime(canvasTip);
    seedRuntimeOthers({ 1: other });

    let builtTooltips = 0;

    characterTooltipTransforms.register(({ currentHtml }) => {
      builtTooltips += 1;

      return currentHtml;
    });

    const cleanup = installCharacterTooltipTransforms();

    // An earlier Shift hover, then the player leaves the character.
    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    canvasTip.show({ clientX: 1, clientY: 2 }, other);
    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(false);
    refreshActiveOtherTooltip();
    canvasTip.hide({});

    // Hover again without Shift; a window blur still reports Shift as released.
    canvasTip.show({ clientX: 3, clientY: 4 }, other);
    originalCanvasTipShow.mockClear();
    const builtBeforeBlur = builtTooltips;

    refreshActiveOtherTooltip();

    expect(originalCanvasTipShow).not.toHaveBeenCalled();
    expect(builtTooltips).toBe(builtBeforeBlur);

    cleanup();
  });
});

describe("installCharacterTooltipTransforms on SI", () => {
  const originalWindowG = Object.getOwnPropertyDescriptor(window, "g");

  // SI keeps others in g.other, builds their html with g.tips.other and puts
  // it in the `tip` attribute of `#other{id}.other` (elements.js newOther).
  function setLegacyRuntime(ids: string[]) {
    const other = Object.fromEntries(
      ids.map((id) => [
        id,
        {
          account: 9822301,
          icon: "",
          id,
          lvl: 300,
          nick: `Other ${id}`,
          prof: "w",
        },
      ]),
    );

    Object.defineProperty(window, "Engine", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, "g", {
      configurable: true,
      value: {
        other,
        tips: { other: (o: { nick: string }) => `<b>${o.nick}</b>` },
      },
    });

    document.body.innerHTML = ids
      .map(
        (id) =>
          `<div class="other" id="other${id}" tip="<b>Other ${id}</b>"><span></span></div>`,
      )
      .join("");
  }

  function hover(id: string | null) {
    const target = id
      ? document.querySelector(`#other${id} span`)
      : document.body;

    target?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  }

  const tipOf = (id: string) =>
    document.getElementById(`other${id}`)?.getAttribute("tip");

  beforeEach(() => {
    characterTooltipTransforms.clear();
    useCharacterTooltipCatchingGuildsStore.getState().clear();
    useOnlineCharacterOwnersStore.getState().clearOwners();
    registerShiftSection();
  });

  afterEach(() => {
    characterTooltipTransforms.clear();
    useCharacterTooltipCatchingGuildsStore.getState().clear();
    document.body.innerHTML = "";
    Object.defineProperty(window, "Engine", {
      configurable: true,
      value: originalWindowEngine,
    });

    if (originalWindowG) {
      Object.defineProperty(window, "g", originalWindowG);
    } else {
      Reflect.deleteProperty(window, "g");
    }
  });

  it("adds the section to the player hovered while Shift is held", () => {
    setLegacyRuntime(["617", "618"]);
    const cleanup = installCharacterTooltipTransforms();

    hover("617");
    expect(tipOf("617")).toBe("<b>Other 617</b>");

    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    refreshActiveOtherTooltip();
    expect(tipOf("617")).toBe("<b>Other 617</b><span>shift</span>");

    hover("618");
    expect(tipOf("618")).toBe("<b>Other 618</b><span>shift</span>");
    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeOther?.d.id,
    ).toBe("618");

    cleanup();
  });

  it("removes the section from every SI tooltip when Shift is released", () => {
    setLegacyRuntime(["617", "618"]);
    const cleanup = installCharacterTooltipTransforms();

    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    hover("617");
    hover("618");
    hover(null);
    expect(
      useCharacterTooltipCatchingGuildsStore.getState().activeOther,
    ).toBeNull();

    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(false);
    refreshActiveOtherTooltip();

    expect(tipOf("617")).toBe("<b>Other 617</b>");
    expect(tipOf("618")).toBe("<b>Other 618</b>");

    cleanup();
  });

  it("stops following the cursor and restores tooltips on cleanup", () => {
    setLegacyRuntime(["617"]);
    const cleanup = installCharacterTooltipTransforms();

    useCharacterTooltipCatchingGuildsStore.getState().setShiftPressed(true);
    hover("617");
    cleanup();

    expect(tipOf("617")).toBe("<b>Other 617</b>");

    hover(null);
    hover("617");
    expect(tipOf("617")).toBe("<b>Other 617</b>");
  });
});
