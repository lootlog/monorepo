import { useEffect, useState } from "react";
import { applyThemeEffectsToRoot, isThemeEffectsIdle } from "./theme-effects";
import { useThemeEffects } from "./use-theme-effects";

/* Mirrors the effects preference and the window's attention state onto <html>.
   A visible window on a second monitor is not "hidden", so focus is tracked
   separately from the Page Visibility API. */
export const ThemeEffectsController = () => {
  const { settings } = useThemeEffects();
  const [hidden, setHidden] = useState(() => document.hidden);
  const [focused, setFocused] = useState(() => document.hasFocus());

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    applyThemeEffectsToRoot({
      root: document.documentElement,
      settings,
      idle: isThemeEffectsIdle({ settings, hidden, focused }),
    });
  }, [settings, hidden, focused]);

  return null;
};
