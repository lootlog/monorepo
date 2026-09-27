/**
 * The game's "Szybka walka" button in the new interface's battle controller.
 * The game creates it once per battle window.
 */
const QUICK_FIGHT_BUTTON_SELECTOR = ".battle-controller .auto-fight-btn";

export const isQuickFightButton = (target: EventTarget | null) =>
  target instanceof Element &&
  target.closest(QUICK_FIGHT_BUTTON_SELECTOR) !== null;

/**
 * Makes the quick-fight button glow in a ping's colour and returns the undo.
 * The glow is a Web Animation, so the button's own styles stay untouched.
 */
export const highlightQuickFightButton = (color: string, pulse: boolean) => {
  const button = document.querySelector<HTMLElement>(
    QUICK_FIGHT_BUTTON_SELECTOR,
  );

  if (!button) return () => undefined;

  const glow = (blur: number) => `0 0 0 2px ${color}, 0 0 ${blur}px ${color}`;

  const animation = button.animate(
    [{ boxShadow: glow(pulse ? 4 : 10) }, { boxShadow: glow(pulse ? 16 : 10) }],
    {
      direction: "alternate",
      duration: 700,
      easing: "ease-in-out",
      iterations: Infinity,
    },
  );

  return () => animation.cancel();
};
