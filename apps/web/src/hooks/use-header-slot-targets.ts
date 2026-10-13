import { useState } from "react";
import type { HeaderSlots } from "@/contexts/header-slots-context";

/** Owns the top bar slot elements for a shell: refs for the bar, value for pages. */
export const useHeaderSlotTargets = () => {
  const [context, setContext] = useState<HTMLElement | null>(null);
  const [actions, setActions] = useState<HTMLElement | null>(null);

  const slots: HeaderSlots = { context, actions };

  return { slots, contextRef: setContext, actionsRef: setActions };
};
