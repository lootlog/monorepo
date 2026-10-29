/**
 * The game's "Szybka walka" button in the new interface's battle controller.
 * The game creates it once per battle window.
 */
const QUICK_FIGHT_BUTTON_SELECTOR = ".battle-controller .auto-fight-btn";

export const isQuickFightButton = (target: EventTarget | null) =>
  target instanceof Element &&
  target.closest(QUICK_FIGHT_BUTTON_SELECTOR) !== null;

/**
 * A glow ring on the button's border box, drawn by a Lootlog element inside
 * the game's button so the button's own styles stay untouched.
 */
const createGlowLayer = (shadow: string) => {
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, {
    borderRadius: "inherit",
    boxShadow: shadow,
    inset: "-1px",
    pointerEvents: "none",
    position: "absolute",
  });

  return layer;
};

/**
 * Makes the quick-fight button glow in a ping's colour and returns the undo.
 * The pulse fades a wider static glow in and out over a narrow one, so it
 * animates only opacity and never repaints the button.
 */
export const highlightQuickFightButton = (color: string, pulse: boolean) => {
  const button = document.querySelector<HTMLElement>(
    QUICK_FIGHT_BUTTON_SELECTOR,
  );

  if (!button) return () => undefined;

  const ring = `0 0 0 2px ${color}`;

  if (!pulse) {
    const glow = createGlowLayer(`${ring}, 0 0 10px ${color}`);
    button.append(glow);

    return () => glow.remove();
  }

  const glow = createGlowLayer(`${ring}, 0 0 4px ${color}`);
  const flare = createGlowLayer(`0 0 16px ${color}`);
  flare.style.willChange = "opacity";
  button.append(glow, flare);

  const animation = flare.animate([{ opacity: 0 }, { opacity: 1 }], {
    direction: "alternate",
    duration: 700,
    easing: "ease-in-out",
    iterations: Infinity,
  });

  return () => {
    animation.cancel();
    glow.remove();
    flare.remove();
  };
};
