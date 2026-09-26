import type { AnyRouter, ParsedLocation } from "@tanstack/react-router";

export const createInitialNavigation = () => {
  let pending = true;
  let initialEntry: string | undefined;

  return {
    isInitial: (preload: boolean, location: ParsedLocation) => {
      if (preload || !pending) return false;

      const entry = location.state.__TSR_key ?? location.href;
      initialEntry ??= entry;

      if (entry !== initialEntry) {
        pending = false;

        return false;
      }

      return true;
    },
    track: (router: Pick<AnyRouter, "subscribe" | "state">) =>
      router.subscribe("onResolved", () => {
        if (router.state.matches.every((match) => match.status === "success")) {
          pending = false;
        }
      }),
  };
};
