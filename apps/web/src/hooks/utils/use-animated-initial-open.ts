import { useEffect, useState } from "react";

export const useAnimatedInitialOpen = (open: boolean) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- the dialog must commit closed once before it opens, or Base UI skips its enter transition.
    setHasMounted(true);
  }, []);

  return open && hasMounted;
};
