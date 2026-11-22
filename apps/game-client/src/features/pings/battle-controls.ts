const QUICK_FIGHT_BUTTON_SELECTOR = ".battle-controller .auto-fight-btn";

export const isQuickFightButton = (target: EventTarget | null) =>
  target instanceof Element &&
  target.closest(QUICK_FIGHT_BUTTON_SELECTOR) !== null;

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
