import { useEffect, useState } from "react";

/**
 * Base UI skips the enter transition of a popup that mounts already open.
 * Lazily mounted dialogs mount on their first open, so hold `open` back for
 * one commit to let the dialog enter from a closed state.
 */
export const useAnimatedInitialOpen = (open: boolean) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- the dialog must commit closed once before it opens, or Base UI skips its enter transition.
    setHasMounted(true);
  }, []);

  return open && hasMounted;
};
