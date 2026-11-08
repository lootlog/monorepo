import type { GameEvent } from "@lootlog/margonem/game-events";
import type { LegacyGameOther } from "@lootlog/margonem/others";
import { ImageData as SkiaImageData } from "@napi-rs/canvas";
import { installTestCanvas } from "@/test/canvas";
import { runtimeEventPipeline } from "@/lib/margonem-runtime/runtime-event-pipeline";
import { auraMark } from "./engine/tooltip";
import { installLegacyAuraTips } from "./legacy-aura-tips";

type LegacyTipsWindow = Window & {
  g?: {
    other: Record<string, LegacyGameOther>;
    tips: { other?: (other: LegacyGameOther) => string };
  };
};

const legacyWindow: LegacyTipsWindow = window;

const AURA_ACCOUNT = "7001";

/**
 * SI with the hero and two others on the map. Like newOther, `game.addOther`
 * builds the tip through `g.tips.other` and writes it to `#other{id}[tip]`
 * (elements.js:2179-2208); `game.updateHero` rewrites `#hero[tip]` as
 * hero._u does (player.js:189-194). Projected events reach the tips the way
 * the pipeline delivers them after the game applied a packet.
 */
function setLegacyGame() {
  let onProjected: ((event: GameEvent) => void) | null = null;
  vi.spyOn(runtimeEventPipeline, "subscribeProjected").mockImplementation(
    (handler) => {
      onProjected = (raw) =>
        handler({
          facts: [],
          ingress: { game: null, intent: null, npcsById: {}, othersById: {} },
          observedAt: 0,
          raw,
          sequence: 0,
        });

      return () => {
        onProjected = null;
      };
    },
  );

  legacyWindow.g = {
    other: {},
    tips: { other: (other) => `<b>${other.nick}</b>` },
  };
  document.body.innerHTML = '<div id="hero" tip="<center>Me</center>"></div>';

  return {
    addOther(id: string, account: number) {
      const other = {
        id,
        account,
        icon: "",
        lvl: 100,
        nick: `Other ${id}`,
        prof: "w",
      };

      legacyWindow.g!.other[id] = other;
      document.body.insertAdjacentHTML(
        "beforeend",
        `<div class="other" id="other${id}"></div>`,
      );
      document
        .getElementById(`other${id}`)
        ?.setAttribute("tip", legacyWindow.g!.tips.other!(other));
      onProjected?.({ other: { [id]: { x: 1, y: 1, dir: 0 } } });
    },
    updateHero() {
      document
        .getElementById("hero")
        ?.setAttribute("tip", "<center>Me</center>");
      onProjected?.({ h: { x: 1 } });
    },
  };
}

const tipOf = (id: string) => document.getElementById(id)?.getAttribute("tip");

/** Lets the tooltip's MutationObserver see what Tip wrote. */
const settle = () => new Promise((resolve) => setTimeout(resolve));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete legacyWindow.g;
  document.body.innerHTML = "";
});

it("marks the tips SI builds for others with an aura and drops the mark when uninstalled", () => {
  const game = setLegacyGame();

  const tips = installLegacyAuraTips({
    auraOf: (account) => (account === AURA_ACCOUNT ? "storm" : undefined),
    heroAura: () => undefined,
  });

  game.addOther("1", Number(AURA_ACCOUNT));
  game.addOther("2", 7002);

  expect(tipOf("other1")).toBe(`<b>Other 1</b>${auraMark("storm")}`);
  expect(tipOf("other2")).toBe("<b>Other 2</b>");

  tips.dispose();

  expect(tipOf("other1")).toBe("<b>Other 1</b>");
});

it("puts the hero's mark back after every hero update rewrites its tip", () => {
  const game = setLegacyGame();
  let heroAura: "storm" | "frost" | undefined = "storm";

  const tips = installLegacyAuraTips({
    auraOf: () => undefined,
    heroAura: () => heroAura,
  });

  expect(tipOf("hero")).toBe(`<center>Me</center>${auraMark("storm")}`);

  game.updateHero();

  expect(tipOf("hero")).toBe(`<center>Me</center>${auraMark("storm")}`);

  heroAura = "frost";
  tips.refresh([]);

  expect(tipOf("hero")).toBe(`<center>Me</center>${auraMark("frost")}`);

  heroAura = undefined;
  tips.refresh([]);

  expect(tipOf("hero")).toBe("<center>Me</center>");
  tips.dispose();
});

it("draws the aura round SI's tip only while the pointer is over a character with one", async () => {
  installTestCanvas();
  vi.stubGlobal("ImageData", SkiaImageData);
  // The tooltip's frames are not needed to see where it draws.
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});

  const game = setLegacyGame();

  const tips = installLegacyAuraTips({
    auraOf: (account) => (account === AURA_ACCOUNT ? "storm" : undefined),
    heroAura: () => undefined,
  });

  game.addOther("1", Number(AURA_ACCOUNT));
  game.addOther("2", 7002);
  const canvas = () => document.querySelector(".ll-aura-tip-canvas");

  // SI's Tip fills `#tip` with the hovered element's tip after the capture listener.
  const hover = (id: string) => {
    const element = document.getElementById(id);
    element?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    let tip = document.getElementById("tip");

    if (!tip) {
      tip = document.createElement("div");
      tip.id = "tip";
      document.body.append(tip);
    }

    tip.innerHTML = element?.getAttribute("tip") ?? "";
  };

  hover("other1");
  await settle();

  expect(canvas()).not.toBeNull();

  document.getElementById("other1")?.dispatchEvent(
    new MouseEvent("mouseout", {
      bubbles: true,
      relatedTarget: document.getElementById("other2"),
    }),
  );
  hover("other2");
  await settle();

  expect(canvas()).toBeNull();
  tips.dispose();
});
