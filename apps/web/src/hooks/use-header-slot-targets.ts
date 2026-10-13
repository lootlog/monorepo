import { useState } from "react";
import type { HeaderSlots } from "@/contexts/header-slots-context";

/** Owns the top bar slot elements for a shell: refs for the bar, value for pages. */
export const useHeaderSlotTargets = () => {
  const [actions, setActions] = useState<HTMLElement | null>(null);
  const [context, setContext] = useState<HTMLElement | null>(null);

  const slots: HeaderSlots = { actions, context };

  return { slots, actionsRef: setActions, contextRef: setContext };
};
