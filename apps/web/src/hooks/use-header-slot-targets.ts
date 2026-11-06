import { useState } from "react";
import type { HeaderSlots } from "@/contexts/header-slots-context";

/** Owns the top bar slot elements for a shell: refs for the bar, value for pages. */
export const useHeaderSlotTargets = () => {
  const [title, setTitle] = useState<HTMLElement | null>(null);
  const [actions, setActions] = useState<HTMLElement | null>(null);
  const [context, setContext] = useState<HTMLElement | null>(null);

  const slots: HeaderSlots = { title, actions, context };

  return {
    slots,
    titleRef: setTitle,
    actionsRef: setActions,
    contextRef: setContext,
  };
};
